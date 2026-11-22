/**
 * A short log of what the over-the-air updater did on this device (APK), kept in localStorage so the
 * Account page can show it. Without it an update that silently fails (as one once did for want of a
 * checksum) can only be guessed at. Safe in the web build: no Capacitor code here.
 */
const KEY = "hisab-nikash-ota-log";
const MAX = 12;

export type OtaLogEntry = { at: number; msg: string };

export function logOta(msg: string): void {
  try {
    const list = readOtaLog();
    list.push({ at: Date.now(), msg: msg.slice(0, 200) });
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    /* storage unavailable */
  }
}

export function readOtaLog(): OtaLogEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as OtaLogEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const errorText = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e) ?? "unknown error";
