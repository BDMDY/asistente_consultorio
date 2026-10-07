"use client";
import { dismissToast, useToast } from "@/lib/toast";
import s from "./shell.module.css";

export default function Toaster() {
  const t = useToast();
  if (!t) return null;
  return (
    <div role="status" aria-live="polite" className={s.toast}>
      {t.text}
      {t.undo && <button type="button" onClick={() => { t.undo?.(); dismissToast(); }}>Deshacer</button>}
    </div>
  );
}
