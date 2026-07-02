import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ThemeProvider } from "./context/ThemeContext";
import { MemorySettingsProvider } from "./context/MemorySettingsContext";
import { Sidebar, type NavKey } from "./components/layout/Sidebar";
import { Footer } from "./components/layout/Footer";
import { SettingsModal } from "./components/layout/SettingsModal";
import { Dashboard } from "./components/dashboard/Dashboard";
import { ScanPage } from "./components/scan/ScanPage";
import { CleanPage } from "./components/clean/CleanPage";
import { OptimizePage } from "./components/optimize/OptimizePage";
import { PrivacyPage } from "./components/privacy/PrivacyPage";
import { ToolsPage } from "./components/tools/ToolsPage";
import { ReportsPage } from "./components/reports/ReportsPage";
import { UpdateToast } from "./components/update/UpdateToast";
import { UpdateModal } from "./components/update/UpdateModal";
import { useUpdateCheck } from "./hooks/useUpdateCheck";
import "./App.css";

function Shell() {
  const { t } = useTranslation();
  const [active, setActive] = useState<NavKey>("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const { info: updateInfo, skip: skipUpdate, remindLater } = useUpdateCheck();

  const handleUpdateNow = () => {
    // MVP: link out to the release page; the download/install pipeline lands later.
    window.open("https://hyot.dev", "_blank");
    setUpdateModalOpen(false);
  };

  return (
    <div className="app-shell">
      <Sidebar
        active={active}
        onNavigate={setActive}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="app-main">
        <header className="app-header">
          <h1>{t(`nav.${active}`)}</h1>
          <p className="app-header-desc">{t(`pageDesc.${active}`)}</p>
        </header>

        <div className="app-content">
          {active === "dashboard" && <Dashboard />}
          {active === "scan" && <ScanPage />}
          {active === "clean" && <CleanPage />}
          {active === "optimize" && <OptimizePage />}
          {active === "privacy" && <PrivacyPage />}
          {active === "tools" && <ToolsPage />}
          {active === "reports" && <ReportsPage />}
        </div>

        <Footer />
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {updateInfo && !updateModalOpen && (
        <UpdateToast version={updateInfo.latest_version} onOpen={() => setUpdateModalOpen(true)} />
      )}

      {updateInfo && updateModalOpen && (
        <UpdateModal
          version={updateInfo.latest_version}
          notesKo={updateInfo.notes_ko}
          notesEn={updateInfo.notes_en}
          onUpdateNow={handleUpdateNow}
          onLater={() => {
            setUpdateModalOpen(false);
            remindLater();
          }}
          onSkip={() => {
            setUpdateModalOpen(false);
            skipUpdate();
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <MemorySettingsProvider>
        <Shell />
      </MemorySettingsProvider>
    </ThemeProvider>
  );
}

export default App;
