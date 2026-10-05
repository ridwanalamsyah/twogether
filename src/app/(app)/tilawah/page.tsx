"use client";

import { useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet, FieldGroup, Chips } from "@/components/ui/Sheet";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useAuth } from "@/stores/auth";
import { useIbadahPrefs } from "@/stores/ibadah";
import { deleteEntry, upsertEntry, upsertItem, useEntries, useItems } from "@/stores/data";
import { usePeople, parsePayload, isoDay, addDays, daysBetween, fromIsoDay } from "@/lib/people";
import { ramadhanRange } from "@/lib/hijri";
import { hapticSuccess } from "@/lib/haptic";
import { konfetti } from "@/lib/konfetti";
import type { ItemRecord } from "@/lib/db";

const TOTAL_PAGES = 604; // Mushaf Madinah
const PAGES_PER_JUZ = 20;

interface KhatamPayload {
  start: string;
  together: boolean;
}

export default function TilawahPage() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const offset = useIbadahPrefs((s) => s.hijriOffset);
  const khatams = useItems(userId, "khatam") ?? [];
  const logs = useEntries(userId, "tilawah") ?? [];
  const [creating, setCreating] = useState(false);
  const [custom, setCustom] = useState("");
  const today = isoDay(new Date());

  const active = [...khatams]
    .filter((k) => k.status !== "done")
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const done = khatams.filter((k) => k.status === "done");
  const kp = parsePayload<KhatamPayload>(active?.payload, { start: today, together: true });

  const forKhatam = active
    ? logs.filter((l) => parsePayload(l.payload, { khatamId: "" }).khatamId === active.id)
    : [];
  const pagesOf = (who: string) =>
    forKhatam.filter((l) => (l.who || me) === who).reduce((s, l) => s + (l.valueNum ?? 0), 0);
  const myPages = pagesOf(me);
  const partnerPages = partner ? pagesOf(partner) : 0;
  const progress = kp.together ? myPages + partnerPages : myPages;
  const pct = Math.min(1, progress / TOTAL_PAGES);
  const daysLeft = active?.date ? Math.max(1, daysBetween(today, active.date) + 1) : null;
  const perDay = daysLeft ? Math.ceil(Math.max(0, TOTAL_PAGES - progress) / daysLeft) : null;
  const todayPages = forKhatam.filter((l) => l.date === today && (l.who || me) === me).reduce((s, l) => s + (l.valueNum ?? 0), 0);

  async function add(pages: number) {
    if (!userId || !active || pages <= 0) return;
    await upsertEntry(userId, {
      kind: "tilawah",
      date: today,
      who: me,
      valueNum: pages,
      payload: JSON.stringify({ khatamId: active.id }),
    });
    hapticSuccess();
    if (progress < TOTAL_PAGES && progress + pages >= TOTAL_PAGES) {
      await upsertItem(userId, { ...active, status: "done" });
      konfetti();
    }
  }

  return (
    <div>
      <AppHeader title="Tilawah" />
      <div className="space-y-4 px-5 pb-10 pt-3">
        {!active ? (
          <div className="surface p-6 text-center">
            <div className="text-[40px]">📖</div>
            <div className="mt-2 text-[17px] font-extrabold text-text-1">Mulai target khatam</div>
            <p className="mt-1 text-[13px] text-text-3">
              Khatam berdua (bagi tugas) atau masing-masing. Catat halaman yang dibaca tiap hari.
            </p>
            <button onClick={() => setCreating(true)} className="btn-accent mt-4 w-full">
              Buat target
            </button>
            {done.length > 0 && (
              <p className="mt-3 text-[12px] text-text-4">Sudah khatam {done.length}× bersama Twogether 🤍</p>
            )}
          </div>
        ) : (
          <>
            <div
              className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-float"
              style={{ background: "linear-gradient(135deg,#0f7a5c,#3aa57a 60%,#d9b24c 140%)" }}
            >
              <div className="flex items-center gap-4">
                <Ring pct={pct} label={`${Math.min(30, Math.floor(progress / PAGES_PER_JUZ))}`} />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-white/85">
                    {kp.together ? "Khatam berdua" : "Khatam pribadi"}
                  </div>
                  <div className="text-[24px] font-extrabold leading-tight">
                    {progress}/{TOTAL_PAGES} halaman
                  </div>
                  <div className="text-[12px] text-white/85">
                    {active.date
                      ? `Target ${fromIsoDay(active.date).toLocaleDateString("id-ID", { day: "numeric", month: "long" })} · ${perDay} hal/hari${kp.together && partner ? " berdua" : ""}`
                      : "Tanpa tenggat"}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-white/15 px-3.5 py-2.5 text-[13px]">
                Hari ini kamu: <b>{todayPages} halaman</b>
                {perDay ? (todayPages >= perDay ? " — target hari ini tercapai ✓" : ` · kurang ${perDay - todayPages}`) : ""}
              </div>
            </div>

            <div className="surface p-4">
              <div className="mb-2 text-[14px] font-bold text-text-1">Catat bacaan</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  [1, "+1 hal"],
                  [2, "+2 hal"],
                  [5, "+5 hal"],
                  [PAGES_PER_JUZ, "+1 juz"],
                ].map(([n, l]) => (
                  <button
                    key={n}
                    onClick={() => add(n as number)}
                    className="rounded-2xl bg-bg-elev1 py-3 text-[14px] font-bold text-text-1 active:scale-95"
                  >
                    {l}
                  </button>
                ))}
              </div>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void add(Number(custom) || 0);
                  setCustom("");
                }}
              >
                <input
                  className="input-base h-11 flex-1"
                  inputMode="numeric"
                  placeholder="Jumlah halaman lain…"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))}
                />
                <button disabled={!custom} className="rounded-full bg-accent px-4 text-[14px] font-bold text-accent-fg disabled:opacity-40">
                  Catat
                </button>
              </form>
            </div>

            {partner && (
              <div className="surface p-4">
                <div className="mb-3 text-[14px] font-bold text-text-1">Kontribusi</div>
                {[
                  { name: "Kamu", pages: myPages },
                  { name: partner, pages: partnerPages },
                ].map((x) => (
                  <div key={x.name} className="mb-2.5">
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span className="font-semibold text-text-2">{x.name}</span>
                      <span className="font-mono text-text-3">
                        {x.pages} hal · juz {Math.floor(x.pages / PAGES_PER_JUZ)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg-elev2">
                      <div
                        className="h-full rounded-full bg-[#0f7a5c]"
                        style={{ width: `${Math.min(100, (x.pages / TOTAL_PAGES) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="mb-2 px-1 text-[15px] font-extrabold text-text-1">Riwayat</div>
              {forKhatam.length === 0 ? (
                <div className="rounded-[20px] border-2 border-dashed border-border py-8 text-center text-[13px] text-text-3">
                  Belum ada catatan bacaan.
                </div>
              ) : (
                <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
                  {[...forKhatam]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, 30)
                    .map((l) => (
                      <li key={l.id} className="border-b border-border last:border-0">
                        <SwipeRow onDelete={() => userId && deleteEntry(userId, l.id)}>
                          <div className="flex items-center justify-between bg-bg-card px-4 py-3 text-[14px]">
                            <span className="text-text-1">
                              {(l.who || me) === me ? "Kamu" : l.who} · {l.valueNum} halaman
                            </span>
                            <span className="text-[12px] text-text-4">
                              {fromIsoDay(l.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </SwipeRow>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <button onClick={() => setCreating(true)} className="w-full py-2 text-[13px] font-semibold text-text-3">
              Mulai target baru
            </button>
          </>
        )}
      </div>

      {creating && userId && (
        <NewKhatamSheet
          userId={userId}
          me={me}
          hasPartner={!!partner}
          previous={active}
          ramadhanEnd={ramadhanRange(today, offset)?.end ?? null}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}

function Ring({ pct, label }: { pct: number; label: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center">
      <svg viewBox="0 0 76 76" className="absolute inset-0 -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="7" />
        <circle cx="38" cy="38" r={r} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 600ms var(--ease-out)" }} />
      </svg>
      <div className="text-center leading-none">
        <div className="text-[22px] font-extrabold">{label}</div>
        <div className="mt-0.5 text-[10px] text-white/80">juz</div>
      </div>
    </div>
  );
}

function NewKhatamSheet({
  userId,
  me,
  hasPartner,
  previous,
  ramadhanEnd,
  onClose,
}: {
  userId: string;
  me: string;
  hasPartner: boolean;
  previous?: ItemRecord;
  ramadhanEnd: string | null;
  onClose: () => void;
}) {
  const today = isoDay(new Date());
  const [together, setTogether] = useState(hasPartner);
  const [target, setTarget] = useState<string>(addDays(today, 29));
  const options = [
    { value: addDays(today, 29), label: "30 hari" },
    { value: addDays(today, 59), label: "60 hari" },
    ...(ramadhanEnd && ramadhanEnd > today ? [{ value: ramadhanEnd, label: "Akhir Ramadhan" }] : []),
    { value: "", label: "Tanpa tenggat" },
  ];
  async function save() {
    if (previous) await upsertItem(userId, { ...previous, status: "done" });
    await upsertItem(userId, {
      kind: "khatam",
      title: "Target khatam",
      who: me,
      status: "on",
      date: target || undefined,
      payload: JSON.stringify({ start: today, together } satisfies KhatamPayload),
    });
    hapticSuccess();
    onClose();
  }
  return (
    <Sheet title="Target khatam" onClose={onClose} footer={<button onClick={save} className="btn-accent w-full">Mulai</button>}>
      {hasPartner && (
        <FieldGroup label="Mode">
          <Chips
            options={[
              { value: "berdua", label: "Berdua (bagi tugas)" },
              { value: "sendiri", label: "Masing-masing" },
            ]}
            value={together ? "berdua" : "sendiri"}
            onChange={(v) => setTogether(v === "berdua")}
          />
        </FieldGroup>
      )}
      <FieldGroup label="Selesai dalam">
        <Chips options={options} value={target} onChange={setTarget} />
      </FieldGroup>
      {previous && <p className="text-[12px] text-text-4">Target yang sedang berjalan akan ditutup.</p>}
    </Sheet>
  );
}
