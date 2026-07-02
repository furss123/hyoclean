use semver::Version;
use serde::{Deserialize, Serialize};

/// Where HyoClean checks for new releases. Points at the same `releases.json`
/// published under `data/software/hyoclean/` on the HyoT site/repo.
const RELEASES_URL: &str =
    "https://raw.githubusercontent.com/furss123/hyoclean/main/data/software/hyoclean/releases.json";

const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Deserialize)]
struct ReleaseNotes {
    ko: String,
    en: String,
}

#[derive(Deserialize)]
struct ReleaseEntry {
    version: String,
    notes: ReleaseNotes,
}

#[derive(Deserialize)]
struct ReleasesFile {
    current: String,
    releases: Vec<ReleaseEntry>,
}

#[derive(Serialize, Clone)]
pub struct UpdateInfo {
    pub available: bool,
    pub latest_version: String,
    pub notes_ko: String,
    pub notes_en: String,
}

/// Checks the remote releases feed and compares semver against the running
/// build. Any network/parse failure is swallowed into `available: false` —
/// per spec, update checks must never surface an error popup to the user.
#[tauri::command]
pub async fn check_for_update() -> UpdateInfo {
    match fetch_and_compare().await {
        Ok(info) => info,
        Err(_) => UpdateInfo {
            available: false,
            latest_version: CURRENT_VERSION.to_string(),
            notes_ko: String::new(),
            notes_en: String::new(),
        },
    }
}

async fn fetch_and_compare() -> Result<UpdateInfo, Box<dyn std::error::Error>> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()?;
    let body: ReleasesFile = client.get(RELEASES_URL).send().await?.json().await?;

    let current = Version::parse(CURRENT_VERSION)?;
    let latest = Version::parse(&body.current)?;

    if latest > current {
        let entry = body
            .releases
            .iter()
            .find(|r| r.version == body.current);
        let (notes_ko, notes_en) = entry
            .map(|e| (e.notes.ko.clone(), e.notes.en.clone()))
            .unwrap_or_default();

        Ok(UpdateInfo {
            available: true,
            latest_version: body.current,
            notes_ko,
            notes_en,
        })
    } else {
        Ok(UpdateInfo {
            available: false,
            latest_version: body.current,
            notes_ko: String::new(),
            notes_en: String::new(),
        })
    }
}
