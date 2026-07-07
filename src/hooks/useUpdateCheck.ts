import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface UpdateInfo {
  available: boolean;
  ready: boolean;
  latest_version: string;
  notes_ko: string;
  notes_en: string;
}

const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const SKIP_KEY = "hyoclean.update.skippedVersion";

export function useUpdateCheck() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissedToast, setDismissedToast] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const result = await invoke<UpdateInfo>("check_for_update");
        if (cancelled) return;
        const skipped = localStorage.getItem(SKIP_KEY);
        if (result.available && result.ready && result.latest_version !== skipped) {
          setInfo(result);
          setDismissedToast(false);
        }
      } catch (e) {
        // Silently ignore — never surface a network error to the user.
        console.debug("update check failed", e);
      }
    }

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const skip = () => {
    if (info) localStorage.setItem(SKIP_KEY, info.latest_version);
    setInfo(null);
  };

  const remindLater = () => {
    setDismissedToast(false);
    setInfo((prev) => prev); // keep info so the toast still shows on next open
  };

  return { info, dismissedToast, setDismissedToast, skip, remindLater };
}
