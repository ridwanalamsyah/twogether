/**
 * Calendar export: an .ics file (works with Google Calendar, Apple Calendar,
 * Outlook) and one-tap "Tambah ke Google Calendar" links. A full two-way sync
 * needs Google sign-in on a server; this keeps everything on the device.
 */

export interface CalEvent {
  uid: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** "HH:MM" — omitted for all-day events. */
  start?: string;
  end?: string;
  location?: string;
  description?: string;
  repeat?: "weekly" | "yearly";
}

const pad = (n: number) => String(n).padStart(2, "0");
const compactDate = (d: string) => d.replace(/-/g, "");
const compactTime = (t: string) => t.replace(":", "") + "00";

function nextDay(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(y, m - 1, day + 1);
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
}

function escape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets per RFC 5545. */
function fold(line: string) {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i ? " " : "") + line.slice(i, i + 73));
  return parts.join("\r\n");
}

const TZ = "Asia/Jakarta";

export function buildIcs(events: CalEvent[], name = "Twogether"): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Twogether//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(name)}`,
    `X-WR-TIMEZONE:${TZ}`,
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@twogether`, `DTSTAMP:${stamp}`, `SUMMARY:${escape(e.title)}`);
    if (e.start) {
      lines.push(`DTSTART;TZID=${TZ}:${compactDate(e.date)}T${compactTime(e.start)}`);
      lines.push(`DTEND;TZID=${TZ}:${compactDate(e.date)}T${compactTime(e.end ?? e.start)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.date)}`, `DTEND;VALUE=DATE:${nextDay(e.date)}`);
    }
    if (e.repeat === "weekly") lines.push("RRULE:FREQ=WEEKLY");
    if (e.repeat === "yearly") lines.push("RRULE:FREQ=YEARLY");
    if (e.location) lines.push(`LOCATION:${escape(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escape(e.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(e: CalEvent): string {
  const dates = e.start
    ? `${compactDate(e.date)}T${compactTime(e.start)}/${compactDate(e.date)}T${compactTime(e.end ?? e.start)}`
    : `${compactDate(e.date)}/${nextDay(e.date)}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates, ctz: TZ });
  if (e.location) q.set("location", e.location);
  if (e.description) q.set("details", e.description);
  if (e.repeat === "weekly") q.set("recur", "RRULE:FREQ=WEEKLY");
  if (e.repeat === "yearly") q.set("recur", "RRULE:FREQ=YEARLY");
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Share (iOS) or download the .ics file. */
export async function saveIcs(ics: string, filename = "twogether.ics") {
  const file = new File([ics], filename, { type: "text/calendar" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
    try {
      await nav.share({ files: [file], title: "Agenda Twogether" });
      return;
    } catch {
      /* fall back to download */
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
