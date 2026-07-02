import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "auto";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem("hyoclean.theme") as ThemeMode) || "auto"
  );
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    mode === "auto" ? resolveSystemTheme() : mode
  );

  useEffect(() => {
    localStorage.setItem("hyoclean.theme", mode);
    if (mode === "auto") {
      setResolvedTheme(resolveSystemTheme());
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => setResolvedTheme(resolveSystemTheme());
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
    setResolvedTheme(mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
