"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { type Appt, hm } from "@/lib/agenda";
import { checkMove, moveAppt } from "@/lib/agenda-actions";
import { agendaStore } from "@/lib/agenda-store";
import { addDays, todayISO, nextOpenDay, weekday } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { doctorsOf, useMedia } from "@/lib/media";
import { useMediaQuery } from "@/lib/media-query";
import { alertsFor, patientsStore } from "@/lib/patients";
import { paymentsStore } from "@/lib/payments";
import { toast } from "@/lib/toast";
import { CancelDialog, NewApptDialog, PayDialog, RescheduleDialog } from "./dialogs";
import { AgendaDesktop, AgendaMobile } from "./views";

export type Dialog =
  | null
  | { kind: "new"; mode: "single" | "series"; doc?: number; time?: string; patient?: string }
  | { kind: "resched" | "cancel" | "pay" };

export interface AgendaCtx {
  date: string;
  today: string;
  docs: ReturnType<typeof doctorsOf>;
  appts: Appt[];
  selId: number | null;
  setSel: (id: number | null) => void;
  go: (delta: -1 | 1) => void;
  goToday: () => void;
  open: (d: Dialog) => void;
  move: (a: Appt, to: { doc: number; slot: number }) => void;
  alerts: (name: string) => string[];
  paid: (id: number) => number;
}

export default function Agenda() {
  const params = useSearchParams();
  const today = useToday();
  const media = useMedia();
  const [{ appts }] = agendaStore.useStore();
  const [patients] = patientsStore.useStore();
  const [payments] = paymentsStore.useStore();
  const wide = useMediaQuery("(min-width: 900px)");
  const docs = doctorsOf(media);

  const [date, setDate] = useState(() => nextOpenDay(todayISO()));
  const [selId, setSel] = useState<number | null>(null);
  const [dialog, setDialog] = useState<Dialog>(() => {
    const n = params.get("nueva");
    return n ? { kind: "new", mode: params.get("serie") ? "series" : "single", patient: n === "1" ? "" : n } : null;
  });

  const sel = appts.find((a) => a.id === selId) ?? null;
  const ctx: AgendaCtx = {
    date, today, docs, appts, selId, setSel,
    go: (delta) => {
      let d = addDays(date, delta);
      if (weekday(d) === 0) d = addDays(d, delta);
      setDate(d);
    },
    goToday: () => setDate(nextOpenDay(today)),
    open: setDialog,
    move: (a, to) => {
      const c = checkMove(appts, a, to, docs.map((d) => d.id));
      if (!c.ok) return toast(c.error);
      moveAppt(a, to);
      setSel(a.id);
      toast(`Cita movida a ${hm(to.slot)} · ${docs.find((d) => d.id === to.doc)?.name ?? ""}`);
    },
    alerts: (name) => alertsFor(patients, name),
    paid: (id) => payments.filter((p) => p.apptId === id).reduce((n, p) => n + p.amount, 0),
  };

  const firstDoc = docs[0]?.id ?? 0;
  const close = () => setDialog(null);

  return (
    <>
      {wide ? <AgendaDesktop ctx={ctx} /> : <AgendaMobile ctx={ctx} />}
      {dialog?.kind === "new" && (
        <NewApptDialog
          key={`${dialog.mode}-${dialog.time ?? ""}-${dialog.doc ?? ""}`}
          today={today} docs={docs} sheet={!wide} onClose={close}
          initial={{ mode: dialog.mode, date, doc: dialog.doc ?? firstDoc, time: dialog.time ?? firstFreeTime(appts, date, dialog.doc ?? firstDoc), patient: dialog.patient ?? "" }}
          onCreated={(d) => { setDate(d); }}
        />
      )}
      {dialog?.kind === "resched" && sel && <RescheduleDialog a={sel} today={today} docs={docs} sheet={!wide} onClose={close} onDone={(d) => setDate(d)} />}
      {dialog?.kind === "cancel" && sel && <CancelDialog a={sel} sheet={!wide} onClose={close} />}
      {dialog?.kind === "pay" && sel && <PayDialog a={sel} alerts={ctx.alerts(sel.p)} sheet={!wide} onClose={close} />}
    </>
  );
}

function firstFreeTime(appts: Appt[], date: string, doc: number): string {
  for (let s = 0; s + 3 <= 32; s++) {
    if (!appts.some((b) => b.date === date && b.doc === doc && b.st !== "cancelada" && s < b.slot + b.dur && b.slot < s + 3)) return hm(s);
  }
  return "09:00";
}
