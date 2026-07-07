use semver::Version;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{path::PathBuf, process::Command, time::Duration};

const MANIFEST_URL: &str = "https://hyot.dev/updates/hyoclean.json";
const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Deserialize)]
struct Manifest {
    latest: Latest,
    releases: Vec<Release>,
}

#[derive(Deserialize)]
struct Latest {
    stable: Option<String>,
}

#[derive(Deserialize)]
struct Release {
    version: String,
    notes: Option<Notes>,
    #[serde(rename = "primaryAsset")]
    primary_asset: Option<Asset>,
}

#[derive(Deserialize)]
struct Notes {
    ko: Option<String>,
    en: Option<String>,
}

#[derive(Clone, Deserialize)]
struct Asset {
    filename: String,
    url: String,
    sha256: String,
}

#[derive(Serialize, Clone)]
pub struct UpdateInfo {
    pub available: bool,
    pub ready: bool,
    pub latest_version: String,
    pub notes_ko: String,
    pub notes_en: String,
}

#[tauri::command]
pub async fn check_for_update() -> UpdateInfo {
    match fetch_download_and_compare().await {
        Ok(info) => info,
        Err(_) => UpdateInfo {
            available: false,
            ready: false,
            latest_version: CURRENT_VERSION.to_string(),
            notes_ko: String::new(),
            notes_en: String::new(),
        },
    }
}

#[tauri::command]
pub fn install_ready_update(app: tauri::AppHandle) -> Result<(), String> {
    let path = ready_marker_path()?;
    if !path.exists() {
        return Err("No prepared update found.".into());
    }

    let filename = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if filename.ends_with(".msi") {
        Command::new("msiexec")
            .args(["/i", path.to_string_lossy().as_ref(), "/quiet", "/norestart"])
            .spawn()
            .map_err(|err| err.to_string())?;
    } else if filename.ends_with(".exe") {
        Command::new(&path)
            .args(["/S", "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/SP-"])
            .spawn()
            .map_err(|err| err.to_string())?;
    } else {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|err| err.to_string())?;
    }

    app.exit(0);
    Ok(())
}

async fn fetch_download_and_compare() -> Result<UpdateInfo, Box<dyn std::error::Error>> {
    let client = reqwest::Client::builder().timeout(Duration::from_secs(20)).build()?;
    let manifest: Manifest = client.get(MANIFEST_URL).send().await?.json().await?;
    let latest_version = manifest.latest.stable.unwrap_or_else(|| CURRENT_VERSION.to_string());

    if Version::parse(&latest_version)? <= Version::parse(CURRENT_VERSION)? {
        return Ok(UpdateInfo {
            available: false,
            ready: false,
            latest_version,
            notes_ko: String::new(),
            notes_en: String::new(),
        });
    }

    let release = manifest
        .releases
        .iter()
        .find(|release| release.version == latest_version)
        .ok_or("latest release missing")?;
    let asset = release.primary_asset.clone().ok_or("primary asset missing")?;
    let path = download_and_verify(&client, &asset).await?;
    std::fs::write(marker_path()?, path.to_string_lossy().as_bytes())?;

    Ok(UpdateInfo {
        available: true,
        ready: true,
        latest_version,
        notes_ko: release.notes.as_ref().and_then(|notes| notes.ko.clone()).unwrap_or_default(),
        notes_en: release.notes.as_ref().and_then(|notes| notes.en.clone()).unwrap_or_default(),
    })
}

async fn download_and_verify(
    client: &reqwest::Client,
    asset: &Asset,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let bytes = client.get(&asset.url).send().await?.bytes().await?;
    let actual = format!("{:x}", Sha256::digest(&bytes));
    if !asset.sha256.is_empty() && actual != asset.sha256.to_ascii_lowercase() {
        return Err("update checksum mismatch".into());
    }

    let path = update_dir()?.join(&asset.filename);
    tokio::fs::write(&path, bytes).await?;
    Ok(path)
}

fn ready_marker_path() -> Result<PathBuf, String> {
    let raw = std::fs::read_to_string(marker_path()?).map_err(|err| err.to_string())?;
    Ok(PathBuf::from(raw))
}

fn marker_path() -> Result<PathBuf, String> {
    Ok(update_dir()?.join("ready-update.txt"))
}

fn update_dir() -> Result<PathBuf, String> {
    let dir = std::env::temp_dir().join("HyoT").join("hyoclean-updates");
    std::fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    Ok(dir)
}
