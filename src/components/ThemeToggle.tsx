"use client";
import { themeStore, toggleTheme } from "@/lib/theme";
import Icon from "./ui/Icon";

export default function ThemeToggle({ style }: { style?: React.CSSProperties }) {
  const [theme] = themeStore.useStore();
  return (
    <button
      type="button"
      aria-label="Cambiar entre modo claro y oscuro"
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      onClick={toggleTheme}
      style={{ cursor: "pointer", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: 0, color: "inherit", ...style }}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} />
    </button>
  );
}
