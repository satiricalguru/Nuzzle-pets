use serde::Serialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    env, fs, io,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use toml_edit::{value, DocumentMut, Item, Table};

const MANAGED_MARKER: &str = "nuzzle-managed-hook";
const HELPER_NAME: &str = "nuzzle-hook.sh";
const OPENCODE_PLUGIN_ENTRY: &str = "./plugins/nuzzle.js";
const ADAPTER_IDS: &[&str] = &["codex", "claude-code", "cursor", "opencode", "antigravity"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationSummary {
    pub id: String,
    pub display_name: String,
    pub config_path: String,
    pub available: bool,
    pub installed: bool,
    pub healthy: bool,
    pub message: String,
}

#[derive(Debug, thiserror::Error)]
pub enum IntegrationError {
    #[error("unknown integration '{0}'")]
    Unknown(String),
    #[error("{0} is not installed or was not found on PATH")]
    ExecutableMissing(String),
    #[error("I/O error: {0}")]
    Io(#[from] io::Error),
    #[error("refusing to overwrite invalid JSON at {0}")]
    InvalidJson(PathBuf),
    #[error("refusing to overwrite invalid TOML at {0}")]
    InvalidToml(PathBuf),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("could not compute Codex hook trust: {0}")]
    HookHash(String),
}

#[derive(Debug, Clone)]
pub struct IntegrationManager {
    root: PathBuf,
    home: PathBuf,
    search_paths: Vec<PathBuf>,
}

impl IntegrationManager {
    pub fn from_home(root: impl Into<PathBuf>) -> Result<Self, IntegrationError> {
        let home = dirs::home_dir()
            .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "home directory not found"))?;
        Ok(Self::new(root, home))
    }

    pub fn new(root: impl Into<PathBuf>, home: impl Into<PathBuf>) -> Self {
        let home = home.into();
        let mut search_paths: Vec<PathBuf> = env::var_os("PATH")
            .map(|value| env::split_paths(&value).collect())
            .unwrap_or_default();
        for path in [
            home.join(".local/bin"),
            home.join(".cargo/bin"),
            home.join(".npm-global/bin"),
            PathBuf::from("/opt/homebrew/bin"),
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/usr/bin"),
        ] {
            if !search_paths.contains(&path) {
                search_paths.push(path);
            }
        }
        Self {
            root: root.into(),
            home,
            search_paths,
        }
    }

    #[cfg(test)]
    fn new_with_paths(
        root: impl Into<PathBuf>,
        home: impl Into<PathBuf>,
        search_paths: Vec<PathBuf>,
    ) -> Self {
        Self {
            root: root.into(),
            home: home.into(),
            search_paths,
        }
    }

    pub fn list(&self) -> Result<Vec<IntegrationSummary>, IntegrationError> {
        ADAPTER_IDS.iter().map(|id| self.inspect(id)).collect()
    }

    pub fn inspect(&self, id: &str) -> Result<IntegrationSummary, IntegrationError> {
        let spec = spec(id)?;
        let path = self.config_path(id)?;
        let available = spec
            .executables
            .iter()
            .any(|name| self.executable_exists(name));
        let installed = match id {
            "codex" => standard_hooks_installed(&path, id, CODEX_EVENTS)?,
            "claude-code" => standard_hooks_installed(&path, id, CLAUDE_EVENTS)?,
            "cursor" => cursor_hooks_installed(&path, &self.helper_path())?,
            "antigravity" => antigravity_hooks_installed(&path, &self.helper_path())?,
            "opencode" => opencode_installed(&path)?,
            _ => false,
        };
        let healthy = installed && self.helper_path().is_file();
        let message = match (available, installed, healthy) {
            (_, true, true) => "Connected to the native Nuzzle runtime".to_string(),
            (_, true, false) => "Hook configuration found, but the helper is missing".to_string(),
            (true, false, _) => "Detected and ready to connect".to_string(),
            (false, false, _) => "Application executable was not detected".to_string(),
        };
        Ok(IntegrationSummary {
            id: id.to_string(),
            display_name: spec.display_name.to_string(),
            config_path: path.to_string_lossy().into_owned(),
            available,
            installed,
            healthy,
            message,
        })
    }

    pub fn install(&self, id: &str) -> Result<IntegrationSummary, IntegrationError> {
        let adapter = spec(id)?;
        if !adapter
            .executables
            .iter()
            .any(|name| self.executable_exists(name))
        {
            return Err(IntegrationError::ExecutableMissing(
                adapter.display_name.to_string(),
            ));
        }
        self.ensure_helper()?;
        match id {
            "codex" => self.install_codex()?,
            "claude-code" => self.install_standard(id, CLAUDE_EVENTS)?,
            "cursor" => self.install_cursor()?,
            "opencode" => self.install_opencode()?,
            "antigravity" => self.install_antigravity()?,
            _ => return Err(IntegrationError::Unknown(id.to_string())),
        }
        self.inspect(id)
    }

    pub fn uninstall(&self, id: &str) -> Result<IntegrationSummary, IntegrationError> {
        let path = self.config_path(id)?;
        match id {
            "codex" => {
                self.remove_standard(id, CODEX_EVENTS)?;
                self.remove_codex_trust()?;
            }
            "claude-code" => self.remove_standard(id, CLAUDE_EVENTS)?,
            "cursor" => self.remove_cursor()?,
            "opencode" => self.remove_opencode()?,
            "antigravity" => self.remove_antigravity()?,
            _ => return Err(IntegrationError::Unknown(id.to_string())),
        }
        if !path.exists() {
            return self.inspect(id);
        }
        self.inspect(id)
    }

    fn config_path(&self, id: &str) -> Result<PathBuf, IntegrationError> {
        Ok(match id {
            "codex" => self.home.join(".codex/hooks.json"),
            "claude-code" => self.home.join(".claude/settings.json"),
            "cursor" => self.home.join(".cursor/hooks.json"),
            "antigravity" => self.home.join(".gemini/config/hooks.json"),
            "opencode" => opencode_dir(&self.home).join("plugins/nuzzle.js"),
            _ => return Err(IntegrationError::Unknown(id.to_string())),
        })
    }

    fn helper_path(&self) -> PathBuf {
        self.root.join("hooks").join(HELPER_NAME)
    }

    fn executable_exists(&self, name: &str) -> bool {
        self.search_paths
            .iter()
            .any(|dir| is_executable(&dir.join(name)))
    }

    fn ensure_helper(&self) -> Result<(), IntegrationError> {
        let path = self.helper_path();
        write_atomic(&path, helper_script().as_bytes())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&path, fs::Permissions::from_mode(0o755))?;
        }
        Ok(())
    }

    fn backup(&self, id: &str, source: &Path) -> Result<(), IntegrationError> {
        if !source.exists() {
            return Ok(());
        }
        let name = source
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("config");
        let target = self
            .root
            .join("backups")
            .join(id)
            .join(format!("{}-{name}.bak", now_ms()));
        ensure_parent(&target)?;
        fs::copy(source, target)?;
        Ok(())
    }

    fn install_standard(&self, id: &str, events: &[HookEvent]) -> Result<(), IntegrationError> {
        let path = self.config_path(id)?;
        self.backup(id, &path)?;
        let mut document = read_json_optional(&path)?.unwrap_or_else(|| json!({}));
        remove_managed_hooks(&mut document, id);
        merge_standard_hooks(&mut document, id, &self.helper_path(), events, &path)?;
        write_json_atomic(&path, &document)
    }

    fn remove_standard(&self, id: &str, _events: &[HookEvent]) -> Result<(), IntegrationError> {
        let path = self.config_path(id)?;
        if !path.exists() {
            return Ok(());
        }
        self.backup(id, &path)?;
        let mut document = read_json_required(&path)?;
        remove_managed_hooks(&mut document, id);
        write_json_atomic(&path, &document)
    }

    fn install_codex(&self) -> Result<(), IntegrationError> {
        let hooks_path = self.config_path("codex")?;
        self.backup("codex", &hooks_path)?;
        let mut document = read_json_optional(&hooks_path)?.unwrap_or_else(|| json!({}));
        if document.get("nuzzle").is_some() {
            document
                .as_object_mut()
                .expect("validated object")
                .remove("nuzzle");
        }
        remove_managed_hooks(&mut document, "codex");
        merge_standard_hooks(
            &mut document,
            "codex",
            &self.helper_path(),
            CODEX_EVENTS,
            &hooks_path,
        )?;
        write_json_atomic(&hooks_path, &document)?;

        let config_path = self.home.join(".codex/config.toml");
        self.backup("codex", &config_path)?;
        let original = match fs::read_to_string(&config_path) {
            Ok(content) => content,
            Err(error) if error.kind() == io::ErrorKind::NotFound => String::new(),
            Err(error) => return Err(error.into()),
        };
        let mut config = if original.trim().is_empty() {
            DocumentMut::new()
        } else {
            original
                .parse::<DocumentMut>()
                .map_err(|_| IntegrationError::InvalidToml(config_path.clone()))?
        };
        set_codex_hooks_enabled(&mut config, &config_path)?;
        apply_codex_trust(&mut config, &hooks_path, &document, &config_path)?;
        if config.to_string() != original {
            write_atomic(&config_path, config.to_string().as_bytes())?;
        }
        Ok(())
    }

    fn remove_codex_trust(&self) -> Result<(), IntegrationError> {
        let config_path = self.home.join(".codex/config.toml");
        if !config_path.exists() {
            return Ok(());
        }
        self.backup("codex", &config_path)?;
        let original = fs::read_to_string(&config_path)?;
        let mut config = original
            .parse::<DocumentMut>()
            .map_err(|_| IntegrationError::InvalidToml(config_path.clone()))?;
        remove_trusted_hashes(&mut config, &self.config_path("codex")?);
        if config.to_string() != original {
            write_atomic(&config_path, config.to_string().as_bytes())?;
        }
        Ok(())
    }

    fn install_cursor(&self) -> Result<(), IntegrationError> {
        let path = self.config_path("cursor")?;
        self.backup("cursor", &path)?;
        let mut document = read_json_optional(&path)?.unwrap_or_else(|| json!({}));
        let object = document
            .as_object_mut()
            .ok_or_else(|| IntegrationError::InvalidJson(path.clone()))?;
        object.entry("version").or_insert_with(|| json!(1));
        let hooks = object.entry("hooks").or_insert_with(|| json!({}));
        let hooks = hooks
            .as_object_mut()
            .ok_or_else(|| IntegrationError::InvalidJson(path.clone()))?;
        for event in CURSOR_EVENTS {
            let entries = hooks
                .entry(event.cli_event)
                .or_insert_with(|| json!([]))
                .as_array_mut()
                .ok_or_else(|| IntegrationError::InvalidJson(path.clone()))?;
            entries.retain(|entry| !entry_is_managed(entry, "cursor"));
            entries.push(json!({
                "command": hook_command("cursor", &self.helper_path(), event.kind),
                "timeout": 1
            }));
        }
        write_json_atomic(&path, &document)
    }

    fn remove_cursor(&self) -> Result<(), IntegrationError> {
        let path = self.config_path("cursor")?;
        if !path.exists() {
            return Ok(());
        }
        self.backup("cursor", &path)?;
        let mut document = read_json_required(&path)?;
        if let Some(hooks) = document.get_mut("hooks").and_then(Value::as_object_mut) {
            for entries in hooks.values_mut().filter_map(Value::as_array_mut) {
                entries.retain(|entry| !entry_is_managed(entry, "cursor"));
            }
        }
        write_json_atomic(&path, &document)
    }

    fn install_antigravity(&self) -> Result<(), IntegrationError> {
        let path = self.config_path("antigravity")?;
        self.backup("antigravity", &path)?;
        let mut document = read_json_optional(&path)?.unwrap_or_else(|| json!({}));
        let object = document
            .as_object_mut()
            .ok_or_else(|| IntegrationError::InvalidJson(path.clone()))?;
        let mut integration = serde_json::Map::new();
        for event in ANTIGRAVITY_EVENTS {
            let handler = json!({
                "type": "command",
                "command": hook_command("antigravity", &self.helper_path(), event.kind),
                "timeout": 1
            });
            let entry = if let Some(matcher) = event.matcher {
                json!([{ "matcher": matcher, "hooks": [handler] }])
            } else {
                json!([handler])
            };
            integration.insert(event.cli_event.to_string(), entry);
        }
        object.insert("nuzzle-antigravity".into(), Value::Object(integration));
        write_json_atomic(&path, &document)
    }

    fn remove_antigravity(&self) -> Result<(), IntegrationError> {
        let path = self.config_path("antigravity")?;
        if !path.exists() {
            return Ok(());
        }
        self.backup("antigravity", &path)?;
        let mut document = read_json_required(&path)?;
        document
            .as_object_mut()
            .expect("validated object")
            .remove("nuzzle-antigravity");
        write_json_atomic(&path, &document)
    }

    fn install_opencode(&self) -> Result<(), IntegrationError> {
        let plugin_path = self.config_path("opencode")?;
        let config_path = opencode_dir(&self.home).join("opencode.json");
        self.backup("opencode", &plugin_path)?;
        self.backup("opencode", &config_path)?;
        write_atomic(&plugin_path, opencode_plugin().as_bytes())?;
        let mut document = read_json_optional(&config_path)?.unwrap_or_else(|| json!({}));
        let object = document
            .as_object_mut()
            .ok_or_else(|| IntegrationError::InvalidJson(config_path.clone()))?;
        let plugins = object.entry("plugin").or_insert_with(|| json!([]));
        let plugins = plugins
            .as_array_mut()
            .ok_or_else(|| IntegrationError::InvalidJson(config_path.clone()))?;
        if !plugins
            .iter()
            .any(|entry| entry.as_str() == Some(OPENCODE_PLUGIN_ENTRY))
        {
            plugins.push(json!(OPENCODE_PLUGIN_ENTRY));
        }
        write_json_atomic(&config_path, &document)
    }

    fn remove_opencode(&self) -> Result<(), IntegrationError> {
        let plugin_path = self.config_path("opencode")?;
        let config_path = opencode_dir(&self.home).join("opencode.json");
        if plugin_path.exists() {
            let content = fs::read_to_string(&plugin_path)?;
            if content.contains(MANAGED_MARKER) {
                self.backup("opencode", &plugin_path)?;
                fs::remove_file(&plugin_path)?;
            }
        }
        if config_path.exists() {
            self.backup("opencode", &config_path)?;
            let mut document = read_json_required(&config_path)?;
            if let Some(plugins) = document.get_mut("plugin").and_then(Value::as_array_mut) {
                plugins.retain(|entry| entry.as_str() != Some(OPENCODE_PLUGIN_ENTRY));
            }
            write_json_atomic(&config_path, &document)?;
        }
        Ok(())
    }
}

#[derive(Clone, Copy)]
struct AdapterSpec {
    display_name: &'static str,
    executables: &'static [&'static str],
}

fn spec(id: &str) -> Result<AdapterSpec, IntegrationError> {
    match id {
        "codex" => Ok(AdapterSpec {
            display_name: "Codex",
            executables: &["codex"],
        }),
        "claude-code" => Ok(AdapterSpec {
            display_name: "Claude Code",
            executables: &["claude"],
        }),
        "cursor" => Ok(AdapterSpec {
            display_name: "Cursor",
            executables: &["cursor-agent", "cursor"],
        }),
        "opencode" => Ok(AdapterSpec {
            display_name: "OpenCode",
            executables: &["opencode"],
        }),
        "antigravity" => Ok(AdapterSpec {
            display_name: "Antigravity",
            executables: &["agy"],
        }),
        _ => Err(IntegrationError::Unknown(id.to_string())),
    }
}

#[derive(Clone, Copy)]
struct HookEvent {
    cli_event: &'static str,
    matcher: Option<&'static str>,
    kind: &'static str,
}

const CODEX_EVENTS: &[HookEvent] = &[
    HookEvent {
        cli_event: "UserPromptSubmit",
        matcher: None,
        kind: "user.prompt",
    },
    HookEvent {
        cli_event: "PreToolUse",
        matcher: Some("*"),
        kind: "tool.before",
    },
    HookEvent {
        cli_event: "PostToolUse",
        matcher: Some("*"),
        kind: "tool.after",
    },
    HookEvent {
        cli_event: "PermissionRequest",
        matcher: Some("*"),
        kind: "permission.waiting",
    },
    HookEvent {
        cli_event: "Stop",
        matcher: None,
        kind: "session.stop",
    },
];

const CLAUDE_EVENTS: &[HookEvent] = &[
    HookEvent {
        cli_event: "UserPromptSubmit",
        matcher: None,
        kind: "user.prompt",
    },
    HookEvent {
        cli_event: "PreToolUse",
        matcher: Some("*"),
        kind: "tool.before",
    },
    HookEvent {
        cli_event: "PostToolUse",
        matcher: Some("*"),
        kind: "tool.after",
    },
    HookEvent {
        cli_event: "PermissionRequest",
        matcher: Some("*"),
        kind: "permission.waiting",
    },
    HookEvent {
        cli_event: "Notification",
        matcher: None,
        kind: "permission.waiting",
    },
    HookEvent {
        cli_event: "Stop",
        matcher: None,
        kind: "session.stop",
    },
];

const CURSOR_EVENTS: &[HookEvent] = &[
    HookEvent {
        cli_event: "beforeSubmitPrompt",
        matcher: None,
        kind: "user.prompt",
    },
    HookEvent {
        cli_event: "preToolUse",
        matcher: None,
        kind: "tool.before",
    },
    HookEvent {
        cli_event: "postToolUse",
        matcher: None,
        kind: "tool.after",
    },
    HookEvent {
        cli_event: "postToolUseFailure",
        matcher: None,
        kind: "session.error",
    },
    HookEvent {
        cli_event: "stop",
        matcher: None,
        kind: "session.stop",
    },
    HookEvent {
        cli_event: "sessionEnd",
        matcher: None,
        kind: "session.stop",
    },
];

const ANTIGRAVITY_EVENTS: &[HookEvent] = &[
    HookEvent {
        cli_event: "PreToolUse",
        matcher: Some("*"),
        kind: "tool.before",
    },
    HookEvent {
        cli_event: "PostToolUse",
        matcher: Some("*"),
        kind: "tool.after",
    },
    HookEvent {
        cli_event: "PostInvocation",
        matcher: None,
        kind: "user.prompt",
    },
    HookEvent {
        cli_event: "Stop",
        matcher: None,
        kind: "session.stop",
    },
];

fn merge_standard_hooks(
    document: &mut Value,
    id: &str,
    helper: &Path,
    events: &[HookEvent],
    path: &Path,
) -> Result<(), IntegrationError> {
    let object = document
        .as_object_mut()
        .ok_or_else(|| IntegrationError::InvalidJson(path.to_path_buf()))?;
    let hooks = object.entry("hooks").or_insert_with(|| json!({}));
    let hooks = hooks
        .as_object_mut()
        .ok_or_else(|| IntegrationError::InvalidJson(path.to_path_buf()))?;
    for event in events {
        let mut group = json!({
            "hooks": [{
                "type": "command",
                "command": hook_command(id, helper, event.kind),
                "timeout": 1,
                "statusMessage": "Updating Nuzzle"
            }]
        });
        if let Some(matcher) = event.matcher {
            group["matcher"] = json!(matcher);
        }
        hooks
            .entry(event.cli_event)
            .or_insert_with(|| json!([]))
            .as_array_mut()
            .ok_or_else(|| IntegrationError::InvalidJson(path.to_path_buf()))?
            .insert(0, group);
    }
    Ok(())
}

fn remove_managed_hooks(document: &mut Value, id: &str) {
    let Some(hooks) = document.get_mut("hooks").and_then(Value::as_object_mut) else {
        return;
    };
    for groups in hooks.values_mut().filter_map(Value::as_array_mut) {
        for group in groups.iter_mut() {
            if let Some(handlers) = group.get_mut("hooks").and_then(Value::as_array_mut) {
                handlers.retain(|entry| !entry_is_managed(entry, id));
            }
        }
        groups.retain(|group| {
            group
                .get("hooks")
                .and_then(Value::as_array)
                .is_none_or(|handlers| !handlers.is_empty())
        });
    }
}

fn entry_is_managed(entry: &Value, id: &str) -> bool {
    entry
        .get("command")
        .and_then(Value::as_str)
        .is_some_and(|command| {
            command.contains(HELPER_NAME) && command.contains(&format!(" {id} "))
        })
}

fn standard_hooks_installed(
    path: &Path,
    id: &str,
    events: &[HookEvent],
) -> Result<bool, IntegrationError> {
    let Some(document) = read_json_optional(path)? else {
        return Ok(false);
    };
    let Some(hooks) = document.get("hooks").and_then(Value::as_object) else {
        return Ok(false);
    };
    Ok(events.iter().all(|event| {
        hooks
            .get(event.cli_event)
            .and_then(Value::as_array)
            .is_some_and(|groups| {
                groups.iter().any(|group| {
                    group
                        .get("hooks")
                        .and_then(Value::as_array)
                        .is_some_and(|entries| {
                            entries.iter().any(|entry| entry_is_managed(entry, id))
                        })
                })
            })
    }))
}

fn cursor_hooks_installed(path: &Path, helper: &Path) -> Result<bool, IntegrationError> {
    let Some(document) = read_json_optional(path)? else {
        return Ok(false);
    };
    let Some(hooks) = document.get("hooks").and_then(Value::as_object) else {
        return Ok(false);
    };
    Ok(CURSOR_EVENTS.iter().all(|event| {
        hooks
            .get(event.cli_event)
            .and_then(Value::as_array)
            .is_some_and(|entries| {
                entries.iter().any(|entry| {
                    entry
                        .get("command")
                        .and_then(Value::as_str)
                        .is_some_and(|command| {
                            command.contains(&helper.to_string_lossy().to_string())
                                && command.contains(" cursor ")
                                && command.contains(event.kind)
                        })
                })
            })
    }))
}

fn antigravity_hooks_installed(path: &Path, helper: &Path) -> Result<bool, IntegrationError> {
    let Some(document) = read_json_optional(path)? else {
        return Ok(false);
    };
    let Some(integration) = document
        .get("nuzzle-antigravity")
        .and_then(Value::as_object)
    else {
        return Ok(false);
    };
    Ok(ANTIGRAVITY_EVENTS.iter().all(|event| {
        integration
            .get(event.cli_event)
            .and_then(Value::as_array)
            .is_some_and(|entries| {
                serde_json::to_string(entries).is_ok_and(|encoded| {
                    encoded.contains(&helper.to_string_lossy().to_string())
                        && encoded.contains(event.kind)
                })
            })
    }))
}

fn opencode_installed(plugin_path: &Path) -> Result<bool, IntegrationError> {
    if !plugin_path.is_file() {
        return Ok(false);
    }
    let source = fs::read_to_string(plugin_path)?;
    if !source.contains(MANAGED_MARKER) {
        return Ok(false);
    }
    let config_path = plugin_path
        .parent()
        .and_then(Path::parent)
        .map(|dir| dir.join("opencode.json"))
        .unwrap_or_else(|| PathBuf::from("opencode.json"));
    Ok(read_json_optional(&config_path)?.is_some_and(|document| {
        document
            .get("plugin")
            .and_then(Value::as_array)
            .is_some_and(|plugins| {
                plugins
                    .iter()
                    .any(|entry| entry.as_str() == Some(OPENCODE_PLUGIN_ENTRY))
            })
    }))
}

fn hook_command(id: &str, helper: &Path, kind: &str) -> String {
    let quoted = shell_quote(&helper.to_string_lossy());
    let fallback = if id == "antigravity" && matches!(kind, "tool.before" | "session.stop") {
        r#"printf '{"decision":"allow"}\n'"#
    } else if id == "cursor" && kind == "user.prompt" {
        r#"printf '{"continue":true}\n'"#
    } else {
        r#"printf '{}\n'"#
    };
    format!("if [ -f {quoted} ]; then {quoted} {id} {kind}; else {fallback}; fi")
}

fn helper_script() -> &'static str {
    r#"#!/bin/sh
# nuzzle-managed-hook
agent="${1:-unknown}"
kind="${2:-unknown}"
input="$(cat)"
compact_input="$(printf '%s' "$input" | tr '\n\r' '  ')"
json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
json_field() {
  printf '%s' "$compact_input" | sed -n 's/.*"'"$1"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}
hook_output() {
  if [ "$agent" = "antigravity" ]; then
    case "$kind" in tool.before|session.stop) printf '{"decision":"allow"}\n'; return;; esac
  fi
  if [ "$agent" = "cursor" ] && [ "$kind" = "user.prompt" ]; then
    printf '{"continue":true}\n'
    return
  fi
  printf '{}\n'
}
if [ "$agent" = "claude-code" ] && printf '%s' "$compact_input" | grep -q '"cursor_version"[[:space:]]*:'; then
  hook_output
  exit 0
fi
tool="$(json_field tool_name)"
[ -n "$tool" ] || tool="$(json_field tool)"
[ -n "$tool" ] || tool="$(json_field toolName)"
runtime="${NUZZLE_RUNTIME_DIR:-$HOME/.nuzzle/runtime}"
endpoint="$(cat "$runtime/event-endpoint" 2>/dev/null)" || { hook_output; exit 0; }
token="$(cat "$runtime/event-token" 2>/dev/null)" || { hook_output; exit 0; }
[ -n "$endpoint" ] && [ -n "$token" ] || { hook_output; exit 0; }
tool_field=""
if [ -n "$tool" ]; then tool_field=",\"tool\":\"$(json_escape "$tool")\""; fi
payload="$(printf '{"agent":"%s","kind":"%s"%s}' "$(json_escape "$agent")" "$(json_escape "$kind")" "$tool_field")"
curl -fsS --noproxy '*' --max-time 0.8 -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$payload" "$endpoint" >/dev/null 2>&1 || true
hook_output
exit 0
"#
}

fn opencode_plugin() -> &'static str {
    r#"// nuzzle-managed-hook
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

function post(kind, tool = "") {
  const runtime = process.env.NUZZLE_RUNTIME_DIR || path.join(os.homedir(), ".nuzzle", "runtime");
  let endpoint;
  let token;
  try {
    endpoint = fs.readFileSync(path.join(runtime, "event-endpoint"), "utf8").trim();
    token = fs.readFileSync(path.join(runtime, "event-token"), "utf8").trim();
  } catch { return Promise.resolve(); }
  let url;
  try { url = new URL(endpoint); } catch { return Promise.resolve(); }
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1") return Promise.resolve();
  const body = JSON.stringify({ agent: "opencode", kind, tool });
  return new Promise((resolve) => {
    const request = http.request({
      hostname: "127.0.0.1",
      port: url.port,
      path: url.pathname,
      method: "POST",
      timeout: 800,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    }, (response) => { response.resume(); response.on("end", resolve); });
    request.on("error", resolve);
    request.on("timeout", () => { request.destroy(); resolve(); });
    request.end(body);
  });
}

export const NuzzlePlugin = async () => ({
  event: async ({ event }) => {
    if (event.type === "tui.prompt.append") await post("user.prompt");
    else if (event.type === "permission.asked") await post("permission.waiting");
    else if (event.type === "session.idle") await post("session.stop");
    else if (event.type === "session.error") await post("session.error");
  },
  "chat.message": async () => post("user.prompt"),
  "tool.execute.before": async (input) => post("tool.before", input?.tool || ""),
  "tool.execute.after": async (input) => post("tool.after", input?.tool || ""),
  "permission.ask": async () => post("permission.waiting")
});
"#
}

#[derive(Serialize)]
struct NormalizedHookIdentity<'a> {
    event_name: &'a str,
    #[serde(flatten)]
    group: TrustedMatcherGroup<'a>,
}

#[derive(Serialize)]
struct TrustedMatcherGroup<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    matcher: Option<&'a str>,
    hooks: [TrustedHook<'a>; 1],
}

#[derive(Serialize)]
#[serde(tag = "type")]
enum TrustedHook<'a> {
    #[serde(rename = "command")]
    Command {
        command: &'a str,
        #[serde(rename = "commandWindows", skip_serializing_if = "Option::is_none")]
        command_windows: Option<&'a str>,
        #[serde(rename = "timeout", skip_serializing_if = "Option::is_none")]
        timeout: Option<u64>,
        r#async: bool,
        #[serde(rename = "statusMessage", skip_serializing_if = "Option::is_none")]
        status_message: Option<&'a str>,
    },
}

fn set_codex_hooks_enabled(config: &mut DocumentMut, path: &Path) -> Result<(), IntegrationError> {
    let features = config
        .entry("features")
        .or_insert_with(|| Item::Table(Table::new()))
        .as_table_mut()
        .ok_or_else(|| IntegrationError::InvalidToml(path.to_path_buf()))?;
    features.insert("hooks", value(true));
    features.remove("codex_hooks");
    Ok(())
}

fn apply_codex_trust(
    config: &mut DocumentMut,
    hooks_path: &Path,
    hooks_document: &Value,
    config_path: &Path,
) -> Result<(), IntegrationError> {
    let hooks = hooks_document
        .get("hooks")
        .and_then(Value::as_object)
        .ok_or_else(|| IntegrationError::InvalidJson(hooks_path.to_path_buf()))?;
    let root = config
        .entry("hooks")
        .or_insert_with(|| Item::Table(Table::new()))
        .as_table_mut()
        .ok_or_else(|| IntegrationError::InvalidToml(config_path.to_path_buf()))?;
    root.set_implicit(true);
    let state = root
        .entry("state")
        .or_insert_with(|| Item::Table(Table::new()))
        .as_table_mut()
        .ok_or_else(|| IntegrationError::InvalidToml(config_path.to_path_buf()))?;

    for event in CODEX_EVENTS {
        let Some(group) = hooks
            .get(event.cli_event)
            .and_then(Value::as_array)
            .and_then(|groups| {
                groups.iter().find(|group| {
                    group
                        .get("hooks")
                        .and_then(Value::as_array)
                        .is_some_and(|entries| {
                            entries.iter().any(|entry| entry_is_managed(entry, "codex"))
                        })
                })
            })
        else {
            continue;
        };
        let Some(handler) = group
            .get("hooks")
            .and_then(Value::as_array)
            .and_then(|entries| {
                entries
                    .iter()
                    .find(|entry| entry_is_managed(entry, "codex"))
            })
        else {
            continue;
        };
        let command = handler
            .get("command")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let timeout = handler.get("timeout").and_then(Value::as_u64).unwrap_or(1);
        let status_message = handler.get("statusMessage").and_then(Value::as_str);
        let identity = NormalizedHookIdentity {
            event_name: codex_event_label(event.cli_event),
            group: TrustedMatcherGroup {
                matcher: event.matcher,
                hooks: [TrustedHook::Command {
                    command,
                    command_windows: None,
                    timeout: Some(timeout.max(1)),
                    r#async: false,
                    status_message,
                }],
            },
        };
        let toml_value = toml::Value::try_from(&identity)
            .map_err(|error| IntegrationError::HookHash(error.to_string()))?;
        let json_value = serde_json::to_value(toml_value)?;
        let canonical = canonical_json(&json_value);
        let bytes = serde_json::to_vec(&canonical)?;
        let digest = Sha256::digest(bytes);
        let trusted_hash = format!("sha256:{digest:x}");
        let key = format!(
            "{}:{}:0:0",
            hooks_path.display(),
            codex_event_label(event.cli_event)
        );
        let entry = state
            .entry(&key)
            .or_insert_with(|| Item::Table(Table::new()))
            .as_table_mut()
            .ok_or_else(|| IntegrationError::InvalidToml(config_path.to_path_buf()))?;
        entry.insert("trusted_hash", value(trusted_hash));
    }
    Ok(())
}

fn remove_trusted_hashes(config: &mut DocumentMut, hooks_path: &Path) {
    let prefix = format!("{}:", hooks_path.display());
    let Some(state) = config
        .get_mut("hooks")
        .and_then(Item::as_table_mut)
        .and_then(|hooks| hooks.get_mut("state"))
        .and_then(Item::as_table_mut)
    else {
        return;
    };
    let keys: Vec<String> = state
        .iter()
        .filter(|(key, _)| key.starts_with(&prefix))
        .map(|(key, _)| key.to_string())
        .collect();
    for key in keys {
        state.remove(&key);
    }
}

fn codex_event_label(event: &str) -> &'static str {
    match event {
        "UserPromptSubmit" => "user_prompt_submit",
        "PreToolUse" => "pre_tool_use",
        "PostToolUse" => "post_tool_use",
        "PermissionRequest" => "permission_request",
        "Stop" => "stop",
        _ => "unknown",
    }
}

fn canonical_json(value: &Value) -> Value {
    match value {
        Value::Object(object) => {
            let mut keys: Vec<&String> = object.keys().collect();
            keys.sort();
            let mut sorted = serde_json::Map::new();
            for key in keys {
                sorted.insert(key.clone(), canonical_json(&object[key]));
            }
            Value::Object(sorted)
        }
        Value::Array(values) => Value::Array(values.iter().map(canonical_json).collect()),
        other => other.clone(),
    }
}

fn opencode_dir(home: &Path) -> PathBuf {
    if let Some(path) = env::var_os("OPENCODE_CONFIG_DIR") {
        return PathBuf::from(path);
    }
    if let Some(path) = env::var_os("XDG_CONFIG_HOME") {
        return PathBuf::from(path).join("opencode");
    }
    home.join(".config/opencode")
}

fn read_json_optional(path: &Path) -> Result<Option<Value>, IntegrationError> {
    if !path.exists() {
        return Ok(None);
    }
    Ok(Some(read_json_required(path)?))
}

fn read_json_required(path: &Path) -> Result<Value, IntegrationError> {
    let value: Value = serde_json::from_slice(&fs::read(path)?)
        .map_err(|_| IntegrationError::InvalidJson(path.to_path_buf()))?;
    if value.is_object() {
        Ok(value)
    } else {
        Err(IntegrationError::InvalidJson(path.to_path_buf()))
    }
}

fn write_json_atomic(path: &Path, value: &Value) -> Result<(), IntegrationError> {
    write_atomic(path, &serde_json::to_vec_pretty(value)?)
}

fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), IntegrationError> {
    ensure_parent(path)?;
    let temp = path.with_extension("nuzzle-tmp");
    fs::write(&temp, bytes)?;
    fs::rename(temp, path)?;
    Ok(())
}

fn ensure_parent(path: &Path) -> Result<(), IntegrationError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    Ok(())
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn is_executable(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        path.metadata()
            .map(|metadata| metadata.permissions().mode() & 0o111 != 0)
            .unwrap_or(false)
    }
    #[cfg(not(unix))]
    {
        true
    }
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fake_executable(path: &Path) {
        fs::write(path, "#!/bin/sh\n").unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(path, fs::Permissions::from_mode(0o755)).unwrap();
        }
    }

    #[test]
    fn claude_install_preserves_user_configuration_and_uninstalls_only_nuzzle() {
        let temp = tempfile::tempdir().unwrap();
        let home = temp.path().join("home");
        let root = home.join(".nuzzle");
        let bin = temp.path().join("bin");
        fs::create_dir_all(&bin).unwrap();
        fake_executable(&bin.join("claude"));
        let settings = home.join(".claude/settings.json");
        ensure_parent(&settings).unwrap();
        fs::write(&settings, r#"{"theme":"dark","hooks":{}}"#).unwrap();
        let manager = IntegrationManager::new_with_paths(root, home, vec![bin]);

        let installed = manager.install("claude-code").unwrap();
        assert!(installed.installed);
        let content = read_json_required(&settings).unwrap();
        assert_eq!(content["theme"], "dark");

        let removed = manager.uninstall("claude-code").unwrap();
        assert!(!removed.installed);
        let content = read_json_required(&settings).unwrap();
        assert_eq!(content["theme"], "dark");
    }

    #[test]
    fn invalid_json_is_never_overwritten() {
        let temp = tempfile::tempdir().unwrap();
        let home = temp.path().join("home");
        let root = home.join(".nuzzle");
        let bin = temp.path().join("bin");
        fs::create_dir_all(&bin).unwrap();
        fake_executable(&bin.join("claude"));
        let settings = home.join(".claude/settings.json");
        ensure_parent(&settings).unwrap();
        fs::write(&settings, "{broken").unwrap();
        let manager = IntegrationManager::new_with_paths(root, home, vec![bin]);

        assert!(matches!(
            manager.install("claude-code"),
            Err(IntegrationError::InvalidJson(_))
        ));
        assert_eq!(fs::read_to_string(settings).unwrap(), "{broken");
    }

    #[test]
    fn codex_install_replaces_legacy_entry_and_writes_trusted_hooks() {
        let temp = tempfile::tempdir().unwrap();
        let home = temp.path().join("home");
        let root = home.join(".nuzzle");
        let bin = temp.path().join("bin");
        fs::create_dir_all(&bin).unwrap();
        fake_executable(&bin.join("codex"));
        let hooks = home.join(".codex/hooks.json");
        let config = home.join(".codex/config.toml");
        ensure_parent(&hooks).unwrap();
        fs::write(
            &hooks,
            r#"{"userSetting":"keep","nuzzle":{"url":"http://127.0.0.1:4173/events"}}"#,
        )
        .unwrap();
        fs::write(&config, "[features]\nhooks = false\n").unwrap();
        let manager = IntegrationManager::new_with_paths(root.clone(), home, vec![bin]);

        let installed = manager.install("codex").unwrap();
        assert!(installed.healthy);
        let hooks_value = read_json_required(&hooks).unwrap();
        assert_eq!(hooks_value["userSetting"], "keep");
        assert!(hooks_value.get("nuzzle").is_none());
        assert!(standard_hooks_installed(&hooks, "codex", CODEX_EVENTS).unwrap());

        let config_value = fs::read_to_string(&config).unwrap();
        let config_doc = config_value.parse::<DocumentMut>().unwrap();
        assert_eq!(config_doc["features"]["hooks"].as_bool(), Some(true));
        assert_eq!(
            config_doc["hooks"]["state"].as_table().map(Table::len),
            Some(CODEX_EVENTS.len())
        );
        assert!(root.join("backups/codex").is_dir());
    }
}
