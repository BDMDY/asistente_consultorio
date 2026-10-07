"use client";
import { defineStore } from "./store";

export type Theme = "light" | "dark";
export const themeStore = defineStore<Theme>("da-theme-v1", () => "light");
export const toggleTheme = () => themeStore.update((t) => (t === "dark" ? "light" : "dark"));
