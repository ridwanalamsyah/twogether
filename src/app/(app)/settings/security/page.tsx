"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useSecurity } from "@/stores/security";
import { useAuth } from "@/stores/auth";
import { PushCard } from "@/components/settings/PushCard";
import { SpaceLockCard } from "@/components/settings/SpaceLockCard";
import { PrivacyCard } from "@/components/settings/PrivacyCard";
import {
  notificationStatus,
  requestNotificationPermission,
  showNotification,
  getNotifTimes,
  setNotifTimes,
  scheduleDailyReminders,
} from "@/services/notifications";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SecurityPage() {
  const pinHash = useSecurity((s) => s.pinHash);
  const setPin = useSecurity((s) => s.setPin);
  const clearPin = useSecurity((s) => s.clearPin);
  const lock = useSecurity((s) => s.lock);
  const autoDark = useSecurity((s) => s.autoDark);
  const darkFrom = useSecurity((s) => s.darkFrom);
  const darkTo = useSecurity((s) => s.darkTo);
  const setAutoDark = useSecurity((s) => s.setAutoDark);

  const [pin, setPinInput] = useState("");
  const [pin2, setPin2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [notif, setNotif] = useState<"default" | "granted" | "denied">(
    "default",
  );
  const [morning, setMorning] = useState<string>("07:00");
  const [evening, setEvening] = useState<string>("21:00");
  const [morningOn, setMorningOn] = useState(true);
  const [eveningOn, setEveningOn] = useState(true);

  useEffect(() => {
    setNotif(notificationStatus());
    const t = getNotifTimes();
    setMorning(t.morning ?? "07:00");
    setEvening(t.evening ?? "21:00");
    setMorningOn(t.morning != null);
    setEveningOn(t.evening != null);
  }, []);

  function saveNotifTimes() {
    setNotifTimes({
      morning: morningOn ? morning : null,
      evening: eveningOn ? evening : null,
    });
    scheduleDailyReminders();
    setMsg("Jadwal notif disimpan");
    setTimeout(() => setMsg(null), 2000);
  }

  async function enableNotif() {
    const r = await requestNotificationPermission();
    setNotif(r);
    if (r === "granted") showNotification("Twogether aktif", "Reminder akan muncul di sini.");
  }

  async function savePin() {
    if (pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
      setMsg("PIN harus 4–8 digit angka");
      return;
    }
    if (pin !== pin2) {
      setMsg("Konfirmasi PIN tidak cocok");
      return;
    }
    await setPin(pin);
    setPin("");
    setPin2("");
    setMsg("PIN disimpan");
    setTimeout(() => setMsg(null), 2000);
  }

  function disablePin() {
    if (!confirm("Matikan kunci PIN?")) return;
    clearPin();
  }

  return (
    <div className="animate-in">
      <AppHeader
        title="Keamanan"
        subtitle="PIN & pengingat"
      />

      <div className="space-y-4 px-4 pb-8">
        <PasswordSection />
        <PushCard />
        <SpaceLockCard />
        <PrivacyCard />
        <section className="surface p-4">
          <div className="mb-2 text-[12px] font-bold section-label text-text-3">
            Pengingat
          </div>
          <p className="mb-2 text-xs text-text-3">
            Pengingat muncul saat app dibuka. Di iPhone, pasang ke Layar Utama lewat Safari {">"} Bagikan {">"} Tambah ke Layar Utama.
          </p>
          {notif === "granted" ? (
            <div className="rounded-md bg-positive-bg px-3 py-2 text-xs font-semibold text-[color:var(--positive)]">
              Notifikasi aktif
            </div>
          ) : notif === "denied" ? (
            <div className="rounded-md bg-warning-bg px-3 py-2 text-xs font-semibold text-[color:var(--warning)]">
              Notifikasi dimatikan. Aktifkan di Pengaturan iPhone {">"} Notifikasi.
            </div>
          ) : (
            <button type="button" onClick={enableNotif} className="btn-accent w-full text-sm">
              Aktifkan notifikasi
            </button>
          )}

          {notif === "granted" && (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <div className="text-[12px] font-medium section-label text-text-4">
                Pengingat harian
              </div>
              <div className="flex items-center gap-2">
                <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2.5 text-[13px] text-text-1">
                  <input
                    type="checkbox"
                    checked={morningOn}
                    onChange={(e) => setMorningOn(e.target.checked)}
                    className="h-5 w-5 accent-[color:var(--accent)]"
                  />
                  Pagi
                </label>
                <label htmlFor="notif-morning-time" className="sr-only">Jam pengingat pagi</label>
                <input
                  id="notif-morning-time"
                  type="time"
                  value={morning}
                  onChange={(e) => setMorning(e.target.value)}
                  disabled={!morningOn}
                  className="min-h-[44px] rounded-md bg-transparent px-2 text-[13px] disabled:opacity-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2.5 text-[13px] text-text-1">
                  <input
                    type="checkbox"
                    checked={eveningOn}
                    onChange={(e) => setEveningOn(e.target.checked)}
                    className="h-5 w-5 accent-[color:var(--accent)]"
                  />
                  Malam
                </label>
                <label htmlFor="notif-evening-time" className="sr-only">Jam pengingat malam</label>
                <input
                  id="notif-evening-time"
                  type="time"
                  value={evening}
                  onChange={(e) => setEvening(e.target.value)}
                  disabled={!eveningOn}
                  className="min-h-[44px] rounded-md bg-transparent px-2 text-[13px] disabled:opacity-40"
                />
              </div>
              <button
                type="button"
                onClick={saveNotifTimes}
                className="min-h-[44px] w-full rounded-[14px] bg-accent py-2 text-xs font-medium text-accent-fg active:opacity-80"
              >
                Simpan jadwal
              </button>
              <p className="text-[12px] text-text-4">
                Pengingat muncul saat app dibuka.
              </p>
            </div>
          )}
        </section>

        <section className="surface p-4">
          <div className="mb-2 text-[12px] font-bold section-label text-text-3">
            Kunci dengan PIN
          </div>
          {pinHash ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 rounded-md bg-positive-bg px-3 py-2 text-xs font-semibold text-[color:var(--positive)]">
                <Lock size={14} strokeWidth={2.2} aria-hidden />
                <span>PIN aktif, app dikunci setiap dibuka.</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={lock}
                  className="btn-ghost flex-1 text-sm"
                >
                  Kunci sekarang
                </button>
                <button type="button" onClick={disablePin} className="btn-danger text-sm">
                  Matikan PIN
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="sec-pin-new" className="sr-only">PIN baru 4 sampai 8 digit</label>
              <input
                id="sec-pin-new"
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={8}
                className="input-base"
                placeholder="PIN baru (4–8 digit)"
                value={pin}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              />
              <label htmlFor="sec-pin-confirm" className="sr-only">Ulangi PIN baru</label>
              <input
                id="sec-pin-confirm"
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={8}
                className="input-base"
                placeholder="Ulangi PIN"
                value={pin2}
                onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
              />
              {msg && (
                <div className="text-xs font-semibold text-text-2">{msg}</div>
              )}
              <button
                type="button"
                onClick={savePin}
                className="btn-accent w-full text-sm"
                disabled={pin.length < 4}
              >
                Simpan PIN
              </button>
              <p className="text-[12px] text-text-3">
                PIN hanya tersimpan di HP ini.
              </p>
            </div>
          )}
        </section>

        <section className="surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-bold section-label text-text-3">
              Mode gelap otomatis
            </div>
            <label className="relative inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-end">
              <input
                type="checkbox"
                className="peer sr-only"
                aria-label="Aktifkan mode gelap otomatis"
                checked={autoDark}
                onChange={(e) => setAutoDark(e.target.checked)}
              />
              <span className="relative block h-6 w-11 rounded-full bg-bg-elev3 transition-colors peer-checked:bg-accent peer-checked:[&>span]:translate-x-5">
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform" />
              </span>
            </label>
          </div>
          <p className="mb-3 text-xs text-text-3">
            Pakai tema gelap otomatis di jam tertentu, misalnya 18.00 – 06.00.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <div className="mb-1 text-[12px] font-bold section-label text-text-3">
                Dari jam
              </div>
              <select
                className="input-base"
                value={darkFrom}
                disabled={!autoDark}
                onChange={(e) =>
                  setAutoDark(autoDark, Number(e.target.value), darkTo)
                }
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}.00
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="mb-1 text-[12px] font-bold section-label text-text-3">
                Sampai jam
              </div>
              <select
                className="input-base"
                value={darkTo}
                disabled={!autoDark}
                onChange={(e) =>
                  setAutoDark(autoDark, darkFrom, Number(e.target.value))
                }
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}.00
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Ganti password — or set a new one after opening a "lupa password" link. */
function PasswordSection() {
  const changePassword = useAuth((s) => s.changePassword);
  const setRecoveredPassword = useAuth((s) => s.setRecoveredPassword);
  const [recovery, setRecovery] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      setRecovery(true);
      setOpen(true);
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== next2) {
      setError("Password baru dan ulangnya belum sama");
      return;
    }
    setBusy(true);
    try {
      if (recovery) await setRecoveredPassword(next);
      else await changePassword(current, next);
      setDone(true);
      setOpen(false);
      setRecovery(false);
      setCurrent("");
      setNext("");
      setNext2("");
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => setDone(false), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const type = show ? "text" : "password";

  return (
    <section className="surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[14px] font-semibold text-text-1">Password</div>
          <div className="text-[12px] text-text-3">
            {recovery ? "Buat password baru untuk akunmu" : "Ganti password untuk masuk"}
          </div>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-[44px] rounded-full bg-bg-elev2 px-4 py-2 text-xs font-semibold text-text-1 active:scale-95"
          >
            Ganti
          </button>
        )}
      </div>

      {done && (
        <div className="pop-in mt-3 rounded-md bg-positive-bg px-3 py-2 text-xs font-semibold text-[color:var(--positive)]">
          Password berhasil diganti ✓
        </div>
      )}

      {open && (
        <form onSubmit={submit} className="slide-up mt-3 space-y-2.5">
          {recovery && (
            <p className="rounded-md bg-bg-elev1 px-3 py-2 text-[12px] leading-snug text-text-3">
              Momen pribadi yang dikunci dengan password lama tidak bisa dibuka lagi setelah reset.
              Catatan lain tetap aman.
            </p>
          )}
          {!recovery && (
            <input
              aria-label="Password sekarang"
              className="input-base"
              type={type}
              autoComplete="current-password"
              placeholder="Password sekarang"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          )}
          <input
            aria-label="Password baru"
            className="input-base"
            type={type}
            autoComplete="new-password"
            placeholder="Password baru (min. 6 karakter)"
            minLength={6}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          <input
            aria-label="Ulangi password baru"
            className="input-base"
            type={type}
            autoComplete="new-password"
            placeholder="Ulangi password baru"
            minLength={6}
            value={next2}
            onChange={(e) => setNext2(e.target.value)}
            required
          />
          <label className="flex items-center gap-2 text-[12px] text-text-3">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            Tampilkan password
          </label>
          {error && (
            <div
              role="alert"
              className="pop-in rounded-md bg-negative-bg px-3 py-2 text-xs font-medium text-[color:var(--negative)]"
            >
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            {!recovery && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="btn-ghost flex-1"
              >
                Batal
              </button>
            )}
            <button type="submit" disabled={busy} className="btn-accent flex-1 disabled:opacity-60">
              {busy ? "Menyimpan…" : "Simpan password"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
