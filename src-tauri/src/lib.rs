// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod clean;
mod memory;
mod optimize;
mod privacy;
mod reports;
mod scan;
mod system;
mod tools;
mod update;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(system::SysMonitor::new())
        .invoke_handler(tauri::generate_handler![
            greet,
            memory::get_memory_status,
            memory::clean_memory_now,
            memory::clean_memory_aggressive,
            system::get_system_overview,
            scan::run_deep_scan,
            clean::clean_selected_items,
            clean::restore_clean_batch,
            update::check_for_update,
            update::install_ready_update,
            optimize::list_startup_items,
            optimize::set_startup_item_enabled,
            privacy::run_privacy_scan,
            privacy::clear_run_history,
            tools::open_task_manager,
            tools::open_disk_cleanup,
            tools::open_device_manager,
            tools::open_programs_and_features,
            tools::open_temp_folder,
            tools::open_startup_folder,
            reports::list_clean_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
