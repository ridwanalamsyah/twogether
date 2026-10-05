/** Quick "ping" messages between partners and the shared status. */
export interface PingType {
  id: string;
  emoji: string;
  label: string;
  /** Text the partner sees; {from} is replaced with the sender's name. */
  message: string;
}

export const PINGS: PingType[] = [
  { id: "kangen", emoji: "💗", label: "Kangen", message: "{from} kangen kamu" },
  { id: "peluk", emoji: "🤗", label: "Peluk", message: "{from} kirim pelukan" },
  { id: "otw", emoji: "🛵", label: "OTW", message: "{from} lagi OTW" },
  { id: "sampai", emoji: "🏠", label: "Udah sampai", message: "{from} sudah sampai" },
  { id: "makan", emoji: "🍽️", label: "Udah makan?", message: "{from} nanya: udah makan belum?" },
  { id: "tidur", emoji: "😴", label: "Bobo dulu", message: "{from} mau tidur. Selamat malam 🌙" },
];

export function pingText(typeId: string, from: string, custom?: string): { emoji: string; text: string } {
  if (typeId === "custom") return { emoji: "✍️", text: `${from}: ${custom ?? ""}` };
  const t = PINGS.find((p) => p.id === typeId) ?? PINGS[0];
  return { emoji: t.emoji, text: t.message.replace("{from}", from) };
}

export interface StatusPayload {
  emoji: string;
  text: string;
  /** Social battery 1–5. */
  energy: number;
  at: number;
}

export const STATUS_PRESETS: { emoji: string; text: string }[] = [
  { emoji: "😊", text: "Lagi senang" },
  { emoji: "😴", text: "Capek banget" },
  { emoji: "💼", text: "Lagi sibuk" },
  { emoji: "📚", text: "Lagi belajar" },
  { emoji: "🤒", text: "Kurang enak badan" },
  { emoji: "🫂", text: "Butuh dipeluk" },
  { emoji: "😤", text: "Lagi bete" },
  { emoji: "🍜", text: "Lagi makan" },
];

/** Statuses fade after 12 hours. */
export const STATUS_TTL = 12 * 60 * 60 * 1000;

export function timeAgo(ms: number): string {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}
