use serde::{Deserialize, Serialize};
use std::{
    fs, io,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopStateSnapshot {
    pub selected_pet_id: String,
    pub revision: u64,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredDesktopState {
    selected_pet_id: String,
}

pub struct DesktopState {
    path: PathBuf,
    selected_pet_id: Mutex<String>,
    revision: AtomicU64,
}

impl DesktopState {
    pub fn load(root: &Path) -> Self {
        let path = root.join("settings.json");
        let selected_pet_id = fs::read(&path)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<StoredDesktopState>(&bytes).ok())
            .map(|stored| stored.selected_pet_id)
            .filter(|id| valid_pet_id(id))
            .unwrap_or_else(|| "hu-tao".to_string());
        Self {
            path,
            selected_pet_id: Mutex::new(selected_pet_id),
            revision: AtomicU64::new(0),
        }
    }

    pub fn snapshot(&self) -> DesktopStateSnapshot {
        DesktopStateSnapshot {
            selected_pet_id: self
                .selected_pet_id
                .lock()
                .expect("desktop state poisoned")
                .clone(),
            revision: self.revision.load(Ordering::Relaxed),
        }
    }

    pub fn select_pet(&self, id: &str) -> io::Result<DesktopStateSnapshot> {
        if !valid_pet_id(id) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "invalid pet id",
            ));
        }
        let mut selected = self.selected_pet_id.lock().expect("desktop state poisoned");
        if selected.as_str() != id {
            *selected = id.to_string();
            let stored = StoredDesktopState {
                selected_pet_id: selected.clone(),
            };
            let bytes = serde_json::to_vec_pretty(&stored)?;
            write_atomic(&self.path, &bytes)?;
            self.revision.fetch_add(1, Ordering::Relaxed);
        }
        drop(selected);
        Ok(self.snapshot())
    }
}

fn valid_pet_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

fn write_atomic(path: &Path, bytes: &[u8]) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temporary = path.with_extension("tmp");
    fs::write(&temporary, bytes)?;
    fs::rename(temporary, path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn selection_is_persisted_and_invalid_ids_are_rejected() {
        let temp = tempfile::tempdir().unwrap();
        let state = DesktopState::load(temp.path());
        assert_eq!(state.snapshot().selected_pet_id, "hu-tao");
        assert_eq!(state.select_pet("furina").unwrap().revision, 1);
        assert!(state.select_pet("../bad").is_err());
        assert_eq!(
            DesktopState::load(temp.path()).snapshot().selected_pet_id,
            "furina"
        );
    }
}
