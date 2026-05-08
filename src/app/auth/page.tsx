"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const userId = useAuth((s) => s.userId);
  const signIn = useAuth((s) => s.signIn);
  const signUp = useAuth((s) => s.signUp);
  const signInMagicLink = useAuth((s) => s.signInMagicLink);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [seed, setSeed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  useEffect(() => {
    if (userId) router.replace("/home");
  }, [userId, router]);

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
      router.replace("/home");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-bg-app pt-safe theme-transition">
      <div className="flex flex-1 flex-col justify-center px-7 pt-6">
        <div className="mb-7 flex h-13 w-13 h-[52px] w-[52px] items-center justify-center rounded-[15px] bg-accent text-accent-fg">
          <svg
            viewBox="0 0 28 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <path d="M14 2L2 9v17h7V17h10v9h7V9z" />
          </svg>
        </div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-text-1">
          {mode === "signin" ? "Masuk" : "Buat akun"}
        </h1>
        <p className="mt-1.5 text-[13px] text-text-3">
          Workspace pribadi yang offline-first.
        </p>

        <div className="mt-7 mb-5 flex gap-5 border-b border-border text-sm">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`-mb-px border-b py-2.5 font-medium transition-colors ${
                mode === m
                  ? "border-text-1 text-text-1"
                  : "border-transparent text-text-4"
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
            <input
              className="input-base"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 karakter"
            />
          </Field>
          {mode === "signup" && (
            <>
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
            </>
          )}

          {error && (
            <div className="rounded-md bg-negative-bg px-3 py-2 text-xs font-medium text-[color:var(--negative)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-accent mt-2 w-full disabled:opacity-60"
          >
            {busy
              ? "Memproses…"
              : mode === "signin"
                ? "Masuk"
                : "Daftar & Mulai"}
          </button>
        </form>
        {mode === "signin" && (
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
        Data terenkripsi & disimpan lokal.
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
