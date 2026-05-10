/**
 * Tiny canvas-free confetti — spawns absolutely-positioned divs that fall
 * & fade. Zero deps, ~3ms init. Honors `prefers-reduced-motion`.
 */

const PALETTE = [
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#fde047",
];

export function konfetti(opts?: {
  count?: number;
  origin?: { x: number; y: number };
  duration?: number;
}) {
  if (typeof window === "undefined") return;
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const count = opts?.count ?? 36;
  const ox = opts?.origin?.x ?? window.innerWidth / 2;
  const oy = opts?.origin?.y ?? window.innerHeight / 3;
  const duration = opts?.duration ?? 1100;

  const layer = document.createElement("div");
  layer.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  `;
  document.body.appendChild(layer);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const size = 6 + Math.floor(Math.random() * 6);
    const angle = Math.random() * Math.PI * 2;
    const speed = 180 + Math.random() * 200;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 280;
    const rot = Math.floor(Math.random() * 720 - 360);
    piece.style.cssText = `
      position: absolute;
      left: ${ox}px;
      top: ${oy}px;
      width: ${size}px;
      height: ${size * 1.6}px;
      background: ${color};
      border-radius: 1px;
      transform: translate(-50%, -50%);
      transition: transform ${duration}ms cubic-bezier(.2,.6,.4,1), opacity ${duration}ms ease-out;
      opacity: 1;
    `;
    layer.appendChild(piece);
    requestAnimationFrame(() => {
      piece.style.transform = `translate(${dx}px, ${dy + 600}px) rotate(${rot}deg)`;
      piece.style.opacity = "0";
    });
  }

  setTimeout(() => layer.remove(), duration + 100);
}
