//! User-installed pets that live in the Codex pets folder (`~/.codex/pets`).
//!
//! Nuzzle installs CodexPets.net catalog pets on demand and saves Pet Maker
//! creations here, so they are shared with Codex and never bloat the app
//! bundle. Packages created by Nuzzle carry a marker file; only those can be
//! removed from the studio, and removal moves them to the macOS Trash.

use serde::{Deserialize, Serialize};
use std::{
    fs, io,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

pub const CATALOG_CDN: &str = "https://pub-4976a79db284484f8d370de741d18cf9.r2.dev/codex-pets/";
const MARKER: &str = ".nuzzle-package.json";
const MAX_ATLAS_BYTES: usize = 12 * 1024 * 1024;
const ATLAS_WIDTH: u32 = 1536;
const V1_HEIGHT: u32 = 1872;
const V2_HEIGHT: u32 = 2288;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserPet {
    pub id: String,
    pub display_name: String,
    pub description: String,
    pub spritesheet_path: String,
    pub sprite_version: u8,
    pub source: String,
    pub removable: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Manifest {
    id: Option<String>,
    display_name: Option<String>,
    description: Option<String>,
    spritesheet_path: Option<String>,
    sprite_version_number: Option<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Marker {
    source: String,
}

pub struct PetStore {
    root: PathBuf,
}

impl PetStore {
    pub fn from_codex_home() -> io::Result<Self> {
        let codex_home = std::env::var_os("CODEX_HOME")
            .map(PathBuf::from)
            .or_else(|| dirs::home_dir().map(|home| home.join(".codex")))
            .ok_or_else(|| io::Error::other("Could not find the home directory"))?;
        Ok(Self::new(codex_home.join("pets")))
    }

    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn list(&self) -> io::Result<Vec<UserPet>> {
        let entries = match fs::read_dir(&self.root) {
            Ok(entries) => entries,
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
            Err(error) => return Err(error),
        };
        let mut pets: Vec<UserPet> = entries
            .filter_map(Result::ok)
            .filter(|entry| entry.path().is_dir())
            .filter_map(|entry| self.read_package(&entry.path()))
            .collect();
        pets.sort_by_key(|pet| pet.display_name.to_lowercase());
        Ok(pets)
    }

    fn read_package(&self, dir: &Path) -> Option<UserPet> {
        let folder = dir.file_name()?.to_str()?.to_string();
        if !valid_id(&folder) {
            return None;
        }
        let manifest: Manifest = serde_json::from_slice(&fs::read(dir.join("pet.json")).ok()?).ok()?;
        let sheet_name = manifest
            .spritesheet_path
            .unwrap_or_else(|| "spritesheet.webp".to_string());
        if sheet_name.contains('/') || sheet_name.contains("..") {
            return None;
        }
        let sheet = dir.join(&sheet_name);
        if !sheet.is_file() {
            return None;
        }
        let marker = fs::read(dir.join(MARKER))
            .ok()
            .and_then(|bytes| serde_json::from_slice::<Marker>(&bytes).ok());
        Some(UserPet {
            id: manifest.id.filter(|id| valid_id(id)).unwrap_or(folder),
            display_name: manifest.display_name.unwrap_or_else(|| "Unnamed pet".into()),
            description: manifest.description.unwrap_or_default(),
            spritesheet_path: sheet.to_string_lossy().into_owned(),
            sprite_version: if manifest.sprite_version_number == Some(2) { 2 } else { 1 },
            removable: marker.is_some(),
            source: marker.map(|m| m.source).unwrap_or_else(|| "codex".into()),
        })
    }

    /// Download a CodexPets.net atlas from its CDN and install it as a v1 package.
    pub fn install_from_catalog(
        &self,
        slug: &str,
        name: &str,
        description: &str,
        sheet: &str,
    ) -> io::Result<UserPet> {
        if !valid_id(slug) {
            return Err(invalid("invalid catalog slug"));
        }
        if !valid_sheet_path(sheet) {
            return Err(invalid("catalog sheet must be a .webp or .png on the CodexPets CDN"));
        }
        let bytes = download(&format!("{CATALOG_CDN}{sheet}"))?;
        let id = format!("cp-{slug}").chars().take(64).collect::<String>();
        self.write_package(&id, name, description, &bytes, "codexpets")
    }

    /// Save a Pet Maker atlas (base64 PNG/WebP, optionally as a data URL).
    pub fn save_custom(&self, name: &str, description: &str, image: &str) -> io::Result<UserPet> {
        let encoded = image.split_once(',').map_or(image, |(_, data)| data);
        let bytes = decode_base64(encoded).ok_or_else(|| invalid("image is not valid base64"))?;
        let base = slugify(name);
        let mut id = format!("my-{base}");
        let mut counter = 2;
        while self.root.join(&id).exists() {
            id = format!("my-{base}-{counter}");
            counter += 1;
        }
        self.write_package(&id, name, description, &bytes, "maker")
    }

    fn write_package(
        &self,
        id: &str,
        name: &str,
        description: &str,
        bytes: &[u8],
        source: &str,
    ) -> io::Result<UserPet> {
        if bytes.len() > MAX_ATLAS_BYTES {
            return Err(invalid("atlas is larger than 12 MB"));
        }
        let (extension, width, height) =
            image_dimensions(bytes).ok_or_else(|| invalid("atlas must be a PNG or WebP image"))?;
        if width != ATLAS_WIDTH || (height != V1_HEIGHT && height != V2_HEIGHT) {
            return Err(invalid(&format!(
                "atlas is {width}×{height}; Codex pets must be 1536×1872 (or 1536×2288 for v2)"
            )));
        }
        if height == V2_HEIGHT {
            return Err(invalid(
                "v2 atlases need authored look directions; install them with Codex directly",
            ));
        }

        let dir = self.root.join(id);
        if dir.exists() && !dir.join(MARKER).is_file() {
            return Err(invalid("a pet with this id already exists and was not created by Nuzzle"));
        }
        fs::create_dir_all(&dir)?;
        let sheet_name = format!("spritesheet.{extension}");
        // Remove a stale atlas with the other extension before writing.
        for stale in ["spritesheet.png", "spritesheet.webp"] {
            if stale != sheet_name {
                let _ = fs::remove_file(dir.join(stale));
            }
        }
        write_atomic(&dir.join(&sheet_name), bytes)?;
        let manifest = serde_json::json!({
            "id": id,
            "displayName": clean_text(name, 48),
            "description": clean_text(description, 180),
            "spritesheetPath": sheet_name,
        });
        write_atomic(&dir.join("pet.json"), &serde_json::to_vec_pretty(&manifest)?)?;
        write_atomic(
            &dir.join(MARKER),
            &serde_json::to_vec(&Marker { source: source.into() })?,
        )?;
        self.read_package(&dir)
            .ok_or_else(|| io::Error::other("installed package could not be read back"))
    }

    /// Move a Nuzzle-created package to the Trash so it can still be restored.
    pub fn remove(&self, id: &str) -> io::Result<()> {
        if !valid_id(id) {
            return Err(invalid("invalid pet id"));
        }
        let dir = self.root.join(id);
        if !dir.join(MARKER).is_file() {
            return Err(invalid("only pets installed or made in Nuzzle can be removed here"));
        }
        let trash = dirs::home_dir()
            .map(|home| home.join(".Trash"))
            .filter(|trash| trash.is_dir());
        if let Some(trash) = trash {
            let stamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|elapsed| elapsed.as_secs())
                .unwrap_or_default();
            if fs::rename(&dir, trash.join(format!("{id}-{stamp}"))).is_ok() {
                return Ok(());
            }
        }
        fs::remove_dir_all(dir)
    }
}

fn download(url: &str) -> io::Result<Vec<u8>> {
    // macOS ships curl, which avoids bundling an HTTP/TLS stack in the app.
    let output = Command::new("/usr/bin/curl")
        .args([
            "--fail",
            "--silent",
            "--show-error",
            "--location",
            "--proto",
            "=https",
            "--max-time",
            "60",
            "--max-filesize",
            &MAX_ATLAS_BYTES.to_string(),
            url,
        ])
        .output()?;
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr);
        return Err(io::Error::other(format!(
            "download failed: {}",
            message.trim().trim_start_matches("curl: ")
        )));
    }
    Ok(output.stdout)
}

fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

fn valid_sheet_path(sheet: &str) -> bool {
    !sheet.is_empty()
        && sheet.len() <= 200
        && !sheet.contains("..")
        && !sheet.starts_with('/')
        && (sheet.ends_with(".webp") || sheet.ends_with(".png"))
        && sheet.bytes().all(|byte| {
            byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'/' | b'.')
        })
}

fn slugify(name: &str) -> String {
    let mut slug = String::new();
    for character in name.to_lowercase().chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character);
        } else if !slug.ends_with('-') && !slug.is_empty() {
            slug.push('-');
        }
    }
    let slug = slug.trim_end_matches('-').chars().take(48).collect::<String>();
    if slug.is_empty() {
        "pet".into()
    } else {
        slug
    }
}

fn clean_text(text: &str, limit: usize) -> String {
    text.chars()
        .filter(|character| !character.is_control())
        .take(limit)
        .collect::<String>()
        .trim()
        .to_string()
}

fn invalid(message: &str) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidInput, message.to_string())
}

fn write_atomic(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let temporary = path.with_extension("nuzzle-tmp");
    fs::write(&temporary, bytes)?;
    fs::rename(temporary, path)
}

/// Returns (extension, width, height) for PNG and WebP images.
fn image_dimensions(bytes: &[u8]) -> Option<(&'static str, u32, u32)> {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") && bytes.len() >= 24 && &bytes[12..16] == b"IHDR" {
        let width = u32::from_be_bytes(bytes[16..20].try_into().ok()?);
        let height = u32::from_be_bytes(bytes[20..24].try_into().ok()?);
        return Some(("png", width, height));
    }
    if bytes.len() < 30 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WEBP" {
        return None;
    }
    let data = &bytes[20..];
    let (width, height) = match &bytes[12..16] {
        b"VP8X" => (
            1 + u32::from_le_bytes([data[4], data[5], data[6], 0]),
            1 + u32::from_le_bytes([data[7], data[8], data[9], 0]),
        ),
        b"VP8L" if data[0] == 0x2f => {
            let bits = u32::from_le_bytes([data[1], data[2], data[3], data[4]]);
            (1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff))
        }
        b"VP8 " if data[3..6] == [0x9d, 0x01, 0x2a] => (
            u32::from(u16::from_le_bytes([data[6], data[7]]) & 0x3fff),
            u32::from(u16::from_le_bytes([data[8], data[9]]) & 0x3fff),
        ),
        _ => return None,
    };
    Some(("webp", width, height))
}

fn decode_base64(input: &str) -> Option<Vec<u8>> {
    fn value(byte: u8) -> Option<u32> {
        match byte {
            b'A'..=b'Z' => Some(u32::from(byte - b'A')),
            b'a'..=b'z' => Some(u32::from(byte - b'a') + 26),
            b'0'..=b'9' => Some(u32::from(byte - b'0') + 52),
            b'+' | b'-' => Some(62),
            b'/' | b'_' => Some(63),
            _ => None,
        }
    }
    let clean: Vec<u8> = input
        .bytes()
        .filter(|byte| !byte.is_ascii_whitespace() && *byte != b'=')
        .collect();
    if clean.len() % 4 == 1 {
        return None;
    }
    let mut output = Vec::with_capacity(clean.len() * 3 / 4);
    for chunk in clean.chunks(4) {
        let mut buffer = 0u32;
        for (index, byte) in chunk.iter().enumerate() {
            buffer |= value(*byte)? << (18 - 6 * index);
        }
        let bytes = buffer.to_be_bytes();
        output.extend_from_slice(&bytes[1..chunk.len()]);
    }
    Some(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn png_header(width: u32, height: u32) -> Vec<u8> {
        let mut bytes = b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR".to_vec();
        bytes.extend_from_slice(&width.to_be_bytes());
        bytes.extend_from_slice(&height.to_be_bytes());
        bytes.extend_from_slice(&[8, 6, 0, 0, 0]);
        bytes
    }

    #[test]
    fn base64_round_trips_standard_alphabet() {
        assert_eq!(decode_base64("aGVsbG8=").unwrap(), b"hello");
        assert_eq!(decode_base64("aGk").unwrap(), b"hi");
        assert!(decode_base64("a").is_none());
        assert!(decode_base64("a$==").is_none());
    }

    #[test]
    fn sheet_paths_cannot_escape_the_cdn() {
        assert!(valid_sheet_path("imported/codex-pet-share/keqing/spritesheet.webp"));
        assert!(!valid_sheet_path("../secret.webp"));
        assert!(!valid_sheet_path("/abs.webp"));
        assert!(!valid_sheet_path("pets/evil.html"));
        assert!(!valid_sheet_path("a?b=c.webp"));
    }

    #[test]
    fn custom_pets_are_saved_listed_and_trashed() {
        let temp = tempfile::tempdir().unwrap();
        let store = PetStore::new(temp.path().join("pets"));
        let mut atlas = png_header(ATLAS_WIDTH, V1_HEIGHT);
        atlas.extend_from_slice(&[0; 32]);
        let data_url = format!("data:image/png;base64,{}", encode(&atlas));

        let pet = store.save_custom("Mochi Bun!", "A soft bun", &data_url).unwrap();
        assert_eq!(pet.id, "my-mochi-bun");
        assert_eq!(pet.source, "maker");
        assert!(pet.removable);
        let second = store.save_custom("Mochi Bun!", "", &data_url).unwrap();
        assert_eq!(second.id, "my-mochi-bun-2");
        assert_eq!(store.list().unwrap().len(), 2);

        let wrong = format!("data:image/png;base64,{}", encode(&png_header(100, 100)));
        assert!(store.save_custom("Tiny", "", &wrong).is_err());

        // Packages Nuzzle did not create are listed but protected from removal.
        let foreign = store.root().join("foreign");
        fs::create_dir_all(&foreign).unwrap();
        fs::write(foreign.join("spritesheet.webp"), b"x").unwrap();
        fs::write(foreign.join("pet.json"), br#"{"id":"foreign","displayName":"Foreign"}"#).unwrap();
        let listed = store.list().unwrap();
        assert!(listed.iter().any(|pet| pet.id == "foreign" && !pet.removable));
        assert!(store.remove("foreign").is_err());
        assert!(store.remove("../etc").is_err());
    }

    /// Hits the real CodexPets CDN: `cargo test -- --ignored`.
    #[test]
    #[ignore]
    fn installs_a_real_catalog_pet() {
        let temp = tempfile::tempdir().unwrap();
        let store = PetStore::new(temp.path().join("pets"));
        let pet = store
            .install_from_catalog(
                "luo-xiaohei",
                "Luo Xiaohei",
                "A tiny black cat",
                "imported/codex-pet-share/luo-xiaohei/spritesheet.webp",
            )
            .unwrap();
        assert_eq!(pet.id, "cp-luo-xiaohei");
        assert_eq!(pet.source, "codexpets");
        assert!(pet.spritesheet_path.ends_with("spritesheet.webp"));
        assert!(store
            .install_from_catalog("x", "X", "", "imported/missing/nope.webp")
            .is_err());
    }

    fn encode(bytes: &[u8]) -> String {
        const TABLE: &[u8; 64] =
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut out = String::new();
        for chunk in bytes.chunks(3) {
            let buffer = (u32::from(chunk[0]) << 16)
                | (u32::from(*chunk.get(1).unwrap_or(&0)) << 8)
                | u32::from(*chunk.get(2).unwrap_or(&0));
            for index in 0..=chunk.len() {
                out.push(TABLE[((buffer >> (18 - 6 * index)) & 63) as usize] as char);
            }
        }
        out
    }
}
