import { hm } from "./agenda";

const pad = (n: number) => String(n).padStart(2, "0");

/** Evento .ics en hora de Lima, listo para `data:` URI o descarga. */
export function buildIcs(o: { date: string; slot: number; dur: number; summary: string; location: string }) {
  const stamp = (slot: number) => {
    const [h, m] = hm(slot).split(":");
    return o.date.replace(/-/g, "") + "T" + pad(+h) + pad(+m) + "00";
  };
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DentAssist//ES", "BEGIN:VEVENT",
    `DTSTART;TZID=America/Lima:${stamp(o.slot)}`,
    `DTEND;TZID=America/Lima:${stamp(o.slot + o.dur)}`,
    `SUMMARY:${o.summary}`, `LOCATION:${o.location}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

export const icsHref = (ics: string) => "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
