"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth";
import { isNative } from "@/lib/native";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const userId = useAuth((s) => s.userId);
  const signIn = useAuth((s) => s.signIn);
  const signUp = useAuth((s) => s.signUp);
  const signInMagicLink = useAuth((s) => s.signInMagicLink);
  const bootstrap = useAuth((s) => s.bootstrap);
  const [showPw, setShowPw] = useState(false);
  // Magic links open in Safari, not inside the native app — hide them there.
  const [canMagic, setCanMagic] = useState(true);
  useEffect(() => setCanMagic(!isNative()), []);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [seed, setSeed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  // If the user clicked an invite link before logging in, /join stashed
  // the token in sessionStorage. After a successful sign-in, send them back
  // to /join so the RPC can consume the token under the new auth session.
  function postAuthTarget(): string {
    if (typeof window === "undefined") return "/home";
    const pending = sessionStorage.getItem("twogether:pending-invite");
    if (pending) return `/join?token=${encodeURIComponent(pending)}`;
    return "/home";
  }

  useEffect(() => {
    if (userId) router.replace(postAuthTarget());
  }, [userId, router]);

  // Returning from a magic link (or a session that exists on the server but
  // not yet on this device): bootstrap picks it up and signs us in.
  useEffect(() => {
    void bootstrap();
    router.prefetch("/home");
  }, [bootstrap, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim().toLowerCase(), password);
      } else {
        await signUp({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim() || email.split("@")[0],
          birthday: birthday || undefined,
          seed,
        });
      }
      // No navigation here: the `userId` effect above already redirects as
      // soon as the session exists. Navigating again after the await (sign
      // up keeps seeding sample data) yanked people back to Home after
      // they had already tapped another tab.
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-bg-app pt-safe theme-transition">
      <div className="flex flex-1 flex-col justify-center px-7 pt-6">
        <div className="pop-in mb-7 flex h-[52px] w-[52px] items-center justify-center rounded-[15px] bg-accent text-accent-fg">
          <svg
            viewBox="0 0 44 44"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-9 w-9"
          >
            <circle cx="17" cy="22" r="10" />
            <circle cx="27" cy="22" r="10" />
          </svg>
        </div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-text-1">
          {mode === "signin" ? "Masuk" : "Buat akun"}
        </h1>
        <p className="mt-1.5 text-[13px] text-text-3">
          {mode === "signin"
            ? "Senang lihat kamu lagi 👋"
            : "Satu ruang untuk kalian berdua — uang, jadwal, kenangan."}
        </p>

        <div className="relative mt-7 mb-5 grid grid-cols-2 rounded-[11px] bg-bg-elev2 p-1 text-sm">
          <span
            aria-hidden
            className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-[8px] bg-bg-app shadow-sm transition-transform duration-300 ease-ios"
            style={{
              transform:
                mode === "signin" ? "translateX(0)" : "translateX(100%)",
              left: 4,
            }}
          />
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`relative py-2 font-medium transition-colors duration-200 ${
                mode === m ? "text-text-1" : "text-text-3"
              }`}
            >
              {m === "signin" ? "Masuk" : "Daftar"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="Email">
            <input
              className="input-base"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@gmail.com"
            />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input
                className="input-base pr-16"
                type={showPw ? "text" : "password"}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 karakter"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-[12px] font-medium text-text-3 active:opacity-60"
              >
                {showPw ? "Sembunyi" : "Lihat"}
              </button>
            </div>
          </Field>
          {mode === "signup" && (
            <div key="signup-fields" className="slide-up space-y-3">
              <Field label="Nama">
                <input
                  className="input-base"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap"
                />
              </Field>
              <Field label="Tanggal lahir (opsional)">
                <input
                  className="input-base"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </Field>
              <label className="flex cursor-pointer items-start gap-2 py-1">
                <input
                  type="checkbox"
                  checked={seed}
                  onChange={(e) => setSeed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[color:var(--accent)]"
                />
                <span className="text-[12px] leading-snug text-text-2">
                  Isi dengan contoh data supaya bisa langsung dijelajah.
                </span>
              </label>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="pop-in rounded-md bg-negative-bg px-3 py-2 text-xs font-medium text-[color:var(--negative)]"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-accent mt-2 w-full disabled:opacity-60"
          >
            {busy
              ? mode === "signin"
                ? "Masuk…"
                : "Menyiapkan…"
              : mode === "signin"
                ? "Masuk"
                : "Daftar & Mulai"}
          </button>
        </form>
        {mode === "signin" && canMagic && (
          <div className="mt-4 text-center">
            <button
              type="button"
              disabled={busy || !email || magicSent}
              onClick={async () => {
                setError(null);
                setBusy(true);
                try {
                  await signInMagicLink(email.trim().toLowerCase());
                  setMagicSent(true);
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="text-[12px] text-text-3 underline disabled:opacity-50"
            >
              {magicSent
                ? `Cek email ${email} untuk link masuk`
                : "Kirim magic link ke email saya"}
            </button>
          </div>
        )}
      </div>
      <p className="px-7 pb-[calc(24px+var(--sab))] pt-6 text-center text-[11px] text-text-4">
        Data tersimpan di perangkat & tetap jalan saat offline.
      </p>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-text-3">
        {label}
      </span>
      {children}
    </label>
  );
}
