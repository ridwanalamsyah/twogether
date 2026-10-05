"use client";

import { useEffect, useState } from "react";
import { disablePush, enablePush, pushState, updatePushPrefs, type PushState } from "@/lib/push";
import { hapticSuccess } from "@/lib/haptic";

const ADZAN_KEY = "twogether:push-adzan";

export function PushCard() {
  const [state, setState] = useState<PushState | null>(null);
  const [adzan, setAdzan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void pushState().then(setState);
    try {
      setAdzan(localStorage.getItem(ADZAN_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  async function turnOn() {
    setBusy(true);
    setErr(null);
    try {
      const s = await enablePush({ adzan });
      setState(s);
      if (s === "on") hapticSuccess();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function turnOff() {
    setBusy(true);
    await disablePush().catch(() => undefined);
    setState(await pushState());
    setBusy(false);
  }
  async function toggleAdzan(v: boolean) {
    setAdzan(v);
    try {
      localStorage.setItem(ADZAN_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (state === "on") await updatePushPrefs(v).catch((e) => setErr((e as Error).message));
  }

  return (
    <section className="surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-[20px]">🔔</span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-text-1">Notifikasi walau app ditutup</div>
          <div className="text-[12px] leading-snug text-text-3">
            Kabar dari pasangan, Moment baru, dan pengingat adzan langsung masuk ke HP.
          </div>
        </div>
      </div>

      {state === null ? null : state === "on" ? (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl bg-positive-bg px-3 py-2 text-[13px] font-semibold text-[color:var(--positive)]">
            Aktif di perangkat ini ✓
          </div>
          <Toggle label="Pengingat adzan 5 waktu" sub="Pakai lokasi di halaman Shalat" on={adzan} onChange={toggleAdzan} />
          <button onClick={turnOff} disabled={busy} className="w-full py-2 text-[13px] font-semibold text-text-3">
            Matikan di perangkat ini
          </button>
        </div>
      ) : state === "off" ? (
        <div className="mt-3 space-y-2">
          <Toggle label="Sekalian pengingat adzan" sub="Pakai lokasi di halaman Shalat" on={adzan} onChange={toggleAdzan} />
          <button onClick={turnOn} disabled={busy} className="btn-accent w-full disabled:opacity-60">
            {busy ? "Mengaktifkan…" : "Aktifkan notifikasi"}
          </button>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-bg-elev1 px-3 py-2.5 text-[13px] leading-snug text-text-2">
          {state === "needs-install"
            ? "Di iPhone/iPad: buka Twogether di Safari → Bagikan → Tambah ke Layar Utama, lalu buka dari ikon itu untuk mengaktifkan."
            : state === "denied"
              ? "Notifikasi diblokir. Nyalakan lagi di pengaturan HP/browser untuk Twogether."
              : state === "not-configured"
                ? "Belum disiapkan di server. Sementara ini kabar tetap muncul selama app terbuka."
                : "Perangkat ini belum mendukung notifikasi web. Kabar tetap muncul selama app terbuka."}
        </p>
      )}
      {err && <p className="mt-2 text-[12px] text-[color:var(--negative)]">{err}</p>}
    </section>
  );
}

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl bg-bg-elev1 px-3 py-2.5">
      <span>
        <span className="block text-[14px] font-semibold text-text-1">{label}</span>
        <span className="block text-[12px] text-text-3">{sub}</span>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-[color:var(--accent)]" />
    </label>
  );
}
