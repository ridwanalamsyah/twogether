"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { getDB } from "@/lib/db";
import { compressImage } from "@/lib/image";
import { usePeople } from "@/lib/people";
import { useNick } from "@/lib/nick";

export default function ProfilePage() {
  const auth = useAuth();
  const updateProfile = useAuth((s) => s.updateProfile);
  const [name, setName] = useState(auth.name ?? "");
  const [birthday, setBirthday] = useState<string>("");
  const [avatar, setAvatar] = useState<string | undefined>(
    auth.avatar ?? undefined,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { me, partner } = usePeople();
  const { nick, setNick, ready } = useNick();
  const [myNick, setMyNick] = useState("");
  const [partnerNick, setPartnerNick] = useState("");
  const loadedNicks = useRef(false);
  useEffect(() => {
    if (!ready || loadedNicks.current) return;
    loadedNicks.current = true;
    setMyNick(nick(me) === me ? "" : nick(me));
    if (partner) setPartnerNick(nick(partner) === partner ? "" : nick(partner));
  }, [ready, nick, me, partner]);

  useEffect(() => {
    (async () => {
      if (!auth.userId) return;
      const u = await getDB().users.get(auth.userId);
      if (u) {
        setName(u.name);
        setBirthday(u.birthday ?? "");
        setAvatar(u.avatar ?? undefined);
      }
    })();
  }, [auth.userId]);

  async function pickAvatar(file: File) {
    try {
      const dataUrl = await compressImage(file, 256, 0.82);
      setAvatar(dataUrl);
    } catch {
      // ignore — keep previous avatar
    }
  }

  async function save() {
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() || "Twogether", birthday, avatar });
      if (myNick.trim() !== (nick(me) === me ? "" : nick(me))) await setNick(me, myNick);
      if (partner && partnerNick.trim() !== (nick(partner) === partner ? "" : nick(partner))) await setNick(partner, partnerNick);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-in">
      <AppHeader
        title="Profil"
        subtitle={auth.email ?? undefined}
        actions={
          <Link
            href="/settings"
            className="rounded-full bg-bg-elev2 px-3 py-1.5 text-xs font-semibold text-text-2"
          >
            Kembali
          </Link>
        }
      />

      <div className="space-y-4 px-4 pb-8">
        <div className="surface flex flex-col items-center gap-3 p-6 theme-transition">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative h-24 w-24 overflow-hidden rounded-full bg-accent active:scale-95"
            aria-label="Ganti foto"
          >
            {avatar ? (
              <Image
                src={avatar}
                alt="Avatar"
                fill
                sizes="96px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-accent-fg">
                {(name || "B")[0]?.toUpperCase()}
              </span>
            )}
            <span className="absolute bottom-0 right-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg">
              Ubah
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pickAvatar(f);
            }}
          />
          <div className="text-center text-xs text-text-3">
            Foto dikompresi lokal & disimpan privat di device.
          </div>
        </div>

        <div className="surface space-y-3 p-4">
          <Field label="Nama tampilan">
            <input
              className="input-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
            />
          </Field>
          <Field label="Nama panggilan kamu">
            <input
              className="input-base"
              value={myNick}
              onChange={(e) => setMyNick(e.target.value)}
              placeholder={`mis. ${(name || me).split(" ")[0]}, Mas, Adek`}
              maxLength={20}
            />
          </Field>
          {partner && (
            <Field label={`Panggilan untuk ${partner.split(" ")[0]}`}>
              <input
                className="input-base"
                value={partnerNick}
                onChange={(e) => setPartnerNick(e.target.value)}
                placeholder="mis. Sayang, Dek, Alyaa"
                maxLength={20}
              />
            </Field>
          )}
          <p className="-mt-1 text-[11px] text-text-4">
            Panggilan dipakai di Beranda, kartu uang, dan kabar. Muncul juga di HP pasanganmu.
          </p>
          <Field label="Email">
            <input className="input-base" value={auth.email ?? ""} disabled />
          </Field>
          <Field label="Tanggal lahir">
            <input
              type="date"
              className="input-base"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </Field>
          <button
            onClick={save}
            disabled={saving}
            className="btn-accent w-full text-sm disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : saved ? "Tersimpan ✓" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
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
      <div className="mb-1 text-[11px] font-bold section-label text-text-3">
        {label}
      </div>
      {children}
    </label>
  );
}
