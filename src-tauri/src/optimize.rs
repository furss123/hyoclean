use serde::Serialize;
use winreg::enums::*;
use winreg::RegKey;

const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
/// Disabled entries are parked under our own key instead of deleted outright,
/// so toggling an item back on restores the exact original command — the
/// same "safe, reversible" principle used by the deep-scan cleanup.
const DISABLED_RUN_KEY: &str = r"Software\HyoT\HyoClean\DisabledRun";

#[derive(Serialize, Clone)]
pub struct StartupItem {
    pub name: String,
    pub command: String,
    pub enabled: bool,
}

/// Lists per-user startup entries (HKCU Run key) plus anything HyoClean has
/// already disabled, so the Optimize page can show one unified toggle list.
#[tauri::command]
pub fn list_startup_items() -> Result<Vec<StartupItem>, String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let mut items = Vec::new();

    if let Ok(run) = hkcu.open_subkey(RUN_KEY) {
        for name in run.enum_values().filter_map(|v| v.ok()).map(|(n, _)| n) {
            if let Ok(command) = run.get_value::<String, _>(&name) {
                items.push(StartupItem {
                    name,
                    command,
                    enabled: true,
                });
            }
        }
    }

    if let Ok(disabled) = hkcu.open_subkey(DISABLED_RUN_KEY) {
        for name in disabled
            .enum_values()
            .filter_map(|v| v.ok())
            .map(|(n, _)| n)
        {
            if let Ok(command) = disabled.get_value::<String, _>(&name) {
                items.push(StartupItem {
                    name,
                    command,
                    enabled: false,
                });
            }
        }
    }

    Ok(items)
}

/// Moves a startup entry between the live Run key and the HyoClean-managed
/// disabled key. `enable = false` disables it (removed from autorun);
/// `enable = true` restores it.
#[tauri::command]
pub fn set_startup_item_enabled(name: String, command: String, enable: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    if enable {
        let run = hkcu
            .create_subkey(RUN_KEY)
            .map_err(|e| e.to_string())?
            .0;
        run.set_value(&name, &command).map_err(|e| e.to_string())?;
        if let Ok(disabled) = hkcu.open_subkey_with_flags(DISABLED_RUN_KEY, KEY_SET_VALUE) {
            let _ = disabled.delete_value(&name);
        }
    } else {
        let disabled = hkcu
            .create_subkey(DISABLED_RUN_KEY)
            .map_err(|e| e.to_string())?
            .0;
        disabled
            .set_value(&name, &command)
            .map_err(|e| e.to_string())?;
        if let Ok(run) = hkcu.open_subkey_with_flags(RUN_KEY, KEY_SET_VALUE) {
            let _ = run.delete_value(&name);
        }
    }

    Ok(())
}
