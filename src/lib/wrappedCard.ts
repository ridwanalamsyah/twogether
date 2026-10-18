/**
 * The shareable Wrapped picture: a 1080×1920 (Instagram/WhatsApp story) PNG
 * drawn on a canvas. Deliberately no money figures — it is meant to be posted.
 */

export interface WrappedCardData {
  year: number;
  names: string;
  daysTogether: number | null;
  moments: number;
  activeDays: number;
  habitsDone: number;
}

const W = 1080;
const H = 1920;

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export async function drawWrappedCard(d: WrappedCardData): Promise<Blob> {
  // Use the app font once it's loaded, otherwise the system one.
  await document.fonts?.ready?.catch(() => undefined);
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const accent = cssVar("--accent", "#ff6b7d");
  const accentFg = cssVar("--accent-fg", "#ffffff");

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  g.fillStyle = accent;
  g.fillRect(0, 0, W, H);
  // Soft rings for depth, in the card's own ink colour.
  g.strokeStyle = accentFg;
  g.globalAlpha = 0.08;
  g.lineWidth = 60;
  for (const [x, y, r] of [
    [W, 0, 420],
    [0, H, 520],
    [W * 0.85, H * 0.62, 180],
  ]) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.fillStyle = accentFg;
  g.textBaseline = "alphabetic";

  const text = (s: string, x: number, y: number, size: number, weight = 700, alpha = 1) => {
    g.globalAlpha = alpha;
    g.font = `${weight} ${size}px ${font}`;
    g.fillText(s, x, y);
    g.globalAlpha = 1;
  };

  const L = 96;
  text("TWOGETHER", L, 200, 38, 800, 0.75);
  text(`Wrapped ${d.year}`, L, 330, 112, 800);
  text(d.names, L, 410, 46, 600, 0.85);

  const rows: [string, string][] = [];
  if (d.daysTogether != null) rows.push([d.daysTogether.toLocaleString("id-ID"), "hari bersama"]);
  // Zeros look sad on a picture meant for posting; leave them out.
  if (d.moments) rows.push([d.moments.toLocaleString("id-ID"), "momen yang ditulis"]);
  if (d.activeDays) rows.push([d.activeDays.toLocaleString("id-ID"), "hari mencatat bareng"]);
  if (d.habitsDone) rows.push([d.habitsDone.toLocaleString("id-ID"), "kebiasaan diselesaikan"]);

  let y = 720;
  for (const [big, label] of rows) {
    text(big, L, y, 190, 800);
    text(label, L + 6, y + 70, 48, 600, 0.85);
    y += 300;
  }

  text("dicatat berdua di Twogether", L, H - 140, 40, 600, 0.75);

  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/png"),
  );
}
