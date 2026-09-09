use serde::{Deserialize, Serialize};
use std::{
    collections::VecDeque,
    fs, io,
    io::{Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, Instant},
};

const MAX_EVENT_BODY_BYTES: usize = 16 * 1024;
const MAX_HEADER_BYTES: usize = 8 * 1024;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuntimeEvent {
    pub agent: String,
    pub kind: String,
    #[serde(default)]
    pub tool: Option<String>,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UiAgentEvent {
    pub agent: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub title: String,
    pub sub: String,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub endpoint: String,
    pub accepted_events: u64,
    pub rejected_events: u64,
    pub event_sequence: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SequencedUiEvent {
    pub sequence: u64,
    pub event: UiAgentEvent,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeEventBatch {
    pub latest_sequence: u64,
    pub events: Vec<SequencedUiEvent>,
}

#[derive(Debug)]
struct TokenBucket {
    tokens: f64,
    capacity: f64,
    refill_per_second: f64,
    last_refill: Instant,
}

impl TokenBucket {
    fn new(capacity: u32, refill_per_minute: u32) -> Self {
        Self {
            tokens: f64::from(capacity),
            capacity: f64::from(capacity),
            refill_per_second: f64::from(refill_per_minute) / 60.0,
            last_refill: Instant::now(),
        }
    }

    fn take(&mut self) -> bool {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        self.tokens = (self.tokens + elapsed * self.refill_per_second).min(self.capacity);
        self.last_refill = now;
        if self.tokens < 1.0 {
            return false;
        }
        self.tokens -= 1.0;
        true
    }
}

struct SharedRuntime {
    token: String,
    rate_limit: Mutex<TokenBucket>,
    accepted: AtomicU64,
    rejected: AtomicU64,
    sequence: AtomicU64,
    events: Mutex<VecDeque<SequencedUiEvent>>,
}

pub struct RuntimeManager {
    port: u16,
    runtime_dir: PathBuf,
    shared: Arc<SharedRuntime>,
    shutdown: Arc<AtomicBool>,
}

impl RuntimeManager {
    pub fn start(
        runtime_dir: &Path,
        on_event: impl Fn(SequencedUiEvent) + Send + Sync + 'static,
    ) -> io::Result<Self> {
        fs::create_dir_all(runtime_dir)?;
        let token = rotate_token(runtime_dir)?;
        let listener = TcpListener::bind(("127.0.0.1", 0))?;
        let port = listener.local_addr()?.port();
        let endpoint = format!("http://127.0.0.1:{port}/v1/events");
        write_private_file(&runtime_dir.join("event-endpoint"), endpoint.as_bytes())?;

        let shared = Arc::new(SharedRuntime {
            token,
            rate_limit: Mutex::new(TokenBucket::new(30, 60)),
            accepted: AtomicU64::new(0),
            rejected: AtomicU64::new(0),
            sequence: AtomicU64::new(0),
            events: Mutex::new(VecDeque::with_capacity(100)),
        });
        let shutdown = Arc::new(AtomicBool::new(false));
        let thread_shared = Arc::clone(&shared);
        let thread_shutdown = Arc::clone(&shutdown);
        let callback = Arc::new(on_event);

        thread::Builder::new()
            .name("nuzzle-event-runtime".into())
            .spawn(move || {
                for incoming in listener.incoming() {
                    if thread_shutdown.load(Ordering::Relaxed) {
                        break;
                    }
                    let Ok(mut stream) = incoming else {
                        continue;
                    };
                    let response = match read_http_request(&mut stream) {
                        Ok(request) => process_request(&thread_shared, request, callback.as_ref()),
                        Err(status) => {
                            thread_shared.rejected.fetch_add(1, Ordering::Relaxed);
                            json_response(status, error_name(status))
                        }
                    };
                    let _ = stream.write_all(&response);
                    let _ = stream.flush();
                }
            })?;

        Ok(Self {
            port,
            runtime_dir: runtime_dir.to_path_buf(),
            shared,
            shutdown,
        })
    }

    pub fn status(&self) -> RuntimeStatus {
        RuntimeStatus {
            endpoint: format!("http://127.0.0.1:{}/v1/events", self.port),
            accepted_events: self.shared.accepted.load(Ordering::Relaxed),
            rejected_events: self.shared.rejected.load(Ordering::Relaxed),
            event_sequence: self.shared.sequence.load(Ordering::Relaxed),
        }
    }

    pub fn events_after(&self, after_sequence: u64) -> RuntimeEventBatch {
        let latest_sequence = self.shared.sequence.load(Ordering::Relaxed);
        let events = self
            .shared
            .events
            .lock()
            .expect("event journal poisoned")
            .iter()
            .filter(|entry| entry.sequence > after_sequence)
            .cloned()
            .collect();
        RuntimeEventBatch {
            latest_sequence,
            events,
        }
    }

    pub fn shutdown(&self) {
        if self.shutdown.swap(true, Ordering::Relaxed) {
            return;
        }
        let address = SocketAddr::from(([127, 0, 0, 1], self.port));
        let _ = TcpStream::connect_timeout(&address, Duration::from_millis(100));
        let _ = fs::remove_file(self.runtime_dir.join("event-token"));
        let _ = fs::remove_file(self.runtime_dir.join("event-endpoint"));
    }
}

impl Drop for RuntimeManager {
    fn drop(&mut self) {
        self.shutdown();
    }
}

struct HttpRequest {
    method: String,
    path: String,
    authorization: Option<String>,
    origin: Option<String>,
    body: Vec<u8>,
}

fn read_http_request(stream: &mut TcpStream) -> Result<HttpRequest, u16> {
    stream
        .set_read_timeout(Some(Duration::from_secs(2)))
        .map_err(|_| 400_u16)?;
    let mut bytes = Vec::with_capacity(4096);
    let mut buffer = [0_u8; 2048];
    let header_end;

    loop {
        let read = stream.read(&mut buffer).map_err(|_| 400_u16)?;
        if read == 0 {
            return Err(400_u16);
        }
        bytes.extend_from_slice(&buffer[..read]);
        if let Some(index) = find_subsequence(&bytes, b"\r\n\r\n") {
            header_end = index + 4;
            break;
        }
        if bytes.len() > MAX_HEADER_BYTES {
            return Err(431_u16);
        }
    }

    let header = std::str::from_utf8(&bytes[..header_end]).map_err(|_| 400_u16)?;
    let mut lines = header.split("\r\n");
    let mut request_line = lines.next().ok_or(400_u16)?.split_whitespace();
    let method = request_line.next().ok_or(400_u16)?.to_string();
    let path = request_line.next().ok_or(400_u16)?.to_string();
    let mut content_length = None;
    let mut authorization = None;
    let mut origin = None;

    for line in lines.filter(|line| !line.is_empty()) {
        let Some((name, value)) = line.split_once(':') else {
            return Err(400_u16);
        };
        match name.trim().to_ascii_lowercase().as_str() {
            "content-length" => {
                content_length = Some(value.trim().parse::<usize>().map_err(|_| 400_u16)?);
            }
            "authorization" => authorization = Some(value.trim().to_string()),
            "origin" => origin = Some(value.trim().to_string()),
            _ => {}
        }
    }

    let content_length = content_length.ok_or(411_u16)?;
    if content_length > MAX_EVENT_BODY_BYTES {
        return Err(413_u16);
    }
    while bytes.len() < header_end + content_length {
        let read = stream.read(&mut buffer).map_err(|_| 400_u16)?;
        if read == 0 {
            return Err(400_u16);
        }
        bytes.extend_from_slice(&buffer[..read]);
    }

    Ok(HttpRequest {
        method,
        path,
        authorization,
        origin,
        body: bytes[header_end..header_end + content_length].to_vec(),
    })
}

fn process_request(
    shared: &SharedRuntime,
    request: HttpRequest,
    on_event: &(dyn Fn(SequencedUiEvent) + Send + Sync),
) -> Vec<u8> {
    if request.method != "POST" || request.path != "/v1/events" {
        shared.rejected.fetch_add(1, Ordering::Relaxed);
        return json_response(404, "not_found");
    }
    if request.origin.is_some() {
        shared.rejected.fetch_add(1, Ordering::Relaxed);
        return json_response(403, "browser_origins_not_allowed");
    }
    let expected = format!("Bearer {}", shared.token);
    if request.authorization.as_deref() != Some(expected.as_str()) {
        shared.rejected.fetch_add(1, Ordering::Relaxed);
        return json_response(401, "unauthorized");
    }
    if !shared
        .rate_limit
        .lock()
        .expect("rate limit poisoned")
        .take()
    {
        shared.rejected.fetch_add(1, Ordering::Relaxed);
        return json_response(429, "rate_limited");
    }

    let event = match serde_json::from_slice::<RuntimeEvent>(&request.body) {
        Ok(event) if valid_event(&event) => event,
        _ => {
            shared.rejected.fetch_add(1, Ordering::Relaxed);
            return json_response(400, "invalid_event");
        }
    };
    let ui_event = normalize_event(event);
    let sequence = shared.sequence.fetch_add(1, Ordering::Relaxed) + 1;
    let sequenced = SequencedUiEvent {
        sequence,
        event: ui_event,
    };
    {
        let mut events = shared.events.lock().expect("event journal poisoned");
        if events.len() == 100 {
            events.pop_front();
        }
        events.push_back(sequenced.clone());
    }
    on_event(sequenced);
    shared.accepted.fetch_add(1, Ordering::Relaxed);
    json_response(202, "accepted")
}

fn valid_event(event: &RuntimeEvent) -> bool {
    !event.agent.trim().is_empty()
        && !event.kind.trim().is_empty()
        && event.agent.len() <= 64
        && event.kind.len() <= 64
        && event.tool.as_ref().is_none_or(|value| value.len() <= 160)
        && event.title.as_ref().is_none_or(|value| value.len() <= 200)
        && event.detail.as_ref().is_none_or(|value| value.len() <= 400)
}

fn normalize_event(event: RuntimeEvent) -> UiAgentEvent {
    let display_name = match event.agent.as_str() {
        "codex" => "Codex",
        "claude-code" => "Claude Code",
        "cursor" => "Cursor",
        "opencode" => "OpenCode",
        "antigravity" => "Antigravity",
        other => other,
    };
    let (event_type, action, duration_ms) = match event.kind.as_str() {
        "user.prompt" => ("prompt", "received a prompt", 2400),
        "tool.before" | "tool.after" => ("tool", "is working", 2600),
        "permission.waiting" => ("waiting", "needs your attention", 6000),
        "session.stop" => ("complete", "finished", 3000),
        "session.error" => ("error", "hit an error", 5000),
        _ => ("working", "is active", 2400),
    };
    let tool = event.tool.unwrap_or_default();
    UiAgentEvent {
        agent: display_name.to_string(),
        event_type: event_type.to_string(),
        title: event
            .title
            .unwrap_or_else(|| format!("{display_name} {action}")),
        sub: event
            .detail
            .unwrap_or(if tool.is_empty() { event.kind } else { tool }),
        duration_ms,
    }
}

fn rotate_token(runtime_dir: &Path) -> io::Result<String> {
    let mut raw = [0_u8; 32];
    getrandom::getrandom(&mut raw).map_err(|error| io::Error::other(error.to_string()))?;
    let token = raw
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    write_private_file(&runtime_dir.join("event-token"), token.as_bytes())?;
    Ok(token)
}

fn write_private_file(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let temp = path.with_extension("tmp");
    fs::write(&temp, bytes)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&temp, fs::Permissions::from_mode(0o600))?;
    }
    fs::rename(temp, path)
}

fn json_response(status: u16, message: &str) -> Vec<u8> {
    let reason = match status {
        202 => "Accepted",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        411 => "Length Required",
        413 => "Payload Too Large",
        429 => "Too Many Requests",
        431 => "Request Header Fields Too Large",
        _ => "Error",
    };
    let body = if status == 202 {
        serde_json::json!({ "status": message })
    } else {
        serde_json::json!({ "error": message })
    }
    .to_string();
    format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
    .into_bytes()
}

fn error_name(status: u16) -> &'static str {
    match status {
        411 => "length_required",
        413 => "body_too_large",
        431 => "headers_too_large",
        _ => "bad_request",
    }
}

fn find_subsequence(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicUsize;

    fn request(token: &str, body: &str) -> HttpRequest {
        HttpRequest {
            method: "POST".into(),
            path: "/v1/events".into(),
            authorization: Some(format!("Bearer {token}")),
            origin: None,
            body: body.as_bytes().to_vec(),
        }
    }

    #[test]
    fn accepts_only_authenticated_object_events() {
        let shared = SharedRuntime {
            token: "secret".into(),
            rate_limit: Mutex::new(TokenBucket::new(30, 60)),
            accepted: AtomicU64::new(0),
            rejected: AtomicU64::new(0),
            sequence: AtomicU64::new(0),
            events: Mutex::new(VecDeque::new()),
        };
        let observed = AtomicUsize::new(0);
        let response = process_request(
            &shared,
            request(
                "secret",
                r#"{"agent":"codex","kind":"tool.before","tool":"shell"}"#,
            ),
            &|entry| {
                assert_eq!(entry.event.agent, "Codex");
                assert_eq!(entry.event.event_type, "tool");
                observed.fetch_add(1, Ordering::Relaxed);
            },
        );
        assert!(String::from_utf8(response)
            .unwrap()
            .starts_with("HTTP/1.1 202"));
        assert_eq!(observed.load(Ordering::Relaxed), 1);

        let array_response = process_request(&shared, request("secret", "[]"), &|_| {});
        assert!(String::from_utf8(array_response)
            .unwrap()
            .starts_with("HTTP/1.1 400"));
    }

    #[test]
    fn rejects_missing_token_and_browser_origins() {
        let shared = SharedRuntime {
            token: "secret".into(),
            rate_limit: Mutex::new(TokenBucket::new(30, 60)),
            accepted: AtomicU64::new(0),
            rejected: AtomicU64::new(0),
            sequence: AtomicU64::new(0),
            events: Mutex::new(VecDeque::new()),
        };
        let mut unauthorized = request("wrong", r#"{"agent":"codex","kind":"session.stop"}"#);
        let response = process_request(&shared, unauthorized, &|_| {});
        assert!(String::from_utf8(response)
            .unwrap()
            .starts_with("HTTP/1.1 401"));

        unauthorized = request("secret", r#"{"agent":"codex","kind":"session.stop"}"#);
        unauthorized.origin = Some("https://attacker.example".into());
        let response = process_request(&shared, unauthorized, &|_| {});
        assert!(String::from_utf8(response)
            .unwrap()
            .starts_with("HTTP/1.1 403"));
    }
}
