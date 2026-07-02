import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface MemorySettingsContextValue {
  autoClean: boolean;
  threshold: number;
  setAutoClean: (value: boolean) => void;
  setThreshold: (value: number) => void;
}

const AUTO_CLEAN_KEY = "hyoclean.memory.autoClean";
const THRESHOLD_KEY = "hyoclean.memory.threshold";

const MemorySettingsContext = createContext<MemorySettingsContextValue | null>(null);

function clampThreshold(value: number): number {
  return Math.max(5, Math.min(40, value));
}

export function MemorySettingsProvider({ children }: { children: ReactNode }) {
  const [autoClean, setAutoClean] = useState<boolean>(
    () => localStorage.getItem(AUTO_CLEAN_KEY) !== "false"
  );
  const [threshold, setThresholdState] = useState<number>(() => {
    const raw = Number(localStorage.getItem(THRESHOLD_KEY));
    if (Number.isNaN(raw) || raw <= 0) return 15;
    return clampThreshold(raw);
  });

  useEffect(() => {
    localStorage.setItem(AUTO_CLEAN_KEY, autoClean ? "true" : "false");
  }, [autoClean]);

  useEffect(() => {
    localStorage.setItem(THRESHOLD_KEY, threshold.toString());
  }, [threshold]);

  const setThreshold = (value: number) => {
    setThresholdState(clampThreshold(value));
  };

  return (
    <MemorySettingsContext.Provider value={{ autoClean, threshold, setAutoClean, setThreshold }}>
      {children}
    </MemorySettingsContext.Provider>
  );
}

export function useMemorySettings() {
  const ctx = useContext(MemorySettingsContext);
  if (!ctx) throw new Error("useMemorySettings must be used within MemorySettingsProvider");
  return ctx;
}
