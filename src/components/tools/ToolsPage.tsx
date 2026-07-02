import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import "./ToolsPage.css";

const TOOL_ACTIONS = [
  { key: "taskManager", command: "open_task_manager", icon: "📊" },
  { key: "diskCleanup", command: "open_disk_cleanup", icon: "🧹" },
  { key: "deviceManager", command: "open_device_manager", icon: "🖥️" },
  { key: "programsFeatures", command: "open_programs_and_features", icon: "📦" },
  { key: "tempFolder", command: "open_temp_folder", icon: "📁" },
  { key: "startupFolder", command: "open_startup_folder", icon: "🚀" },
] as const;

export function ToolsPage() {
  const { t } = useTranslation();

  const run = (command: string) => {
    invoke(command).catch((e) => console.debug("tool launch failed", e));
  };

  return (
    <div className="tools-page">
      {TOOL_ACTIONS.map((action) => (
        <button
          key={action.key}
          className="card glass tools-tile"
          onClick={() => run(action.command)}
        >
          <span className="tools-tile-icon">{action.icon}</span>
          <span>{t(`tools.${action.key}`)}</span>
        </button>
      ))}
    </div>
  );
}
