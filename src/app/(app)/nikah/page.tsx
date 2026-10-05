"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Section, SectionTabs, ListBox, Empty, AccentBtn } from "@/components/tracker/Section";
import { Sheet, Field, Chips } from "@/components/ui/Sheet";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useAuth } from "@/stores/auth";
import { deleteItem, upsertItem, useItems } from "@/stores/data";
import { parsePayload, daysBetween, isoDay, fromIsoDay } from "@/lib/people";
import { formatRupiah, formatRupiahShort } from "@/lib/utils";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
import type { ItemRecord } from "@/lib/db";

interface Meta {
  budget: number;
  venue: string;
}
interface BudgetPayload {
  spent: number;
  vendor: string;
}
interface GuestPayload {
  side: "pria" | "wanita" | "bersama";
  count: number;
  rsvp: "ya" | "belum" | "tidak";
}

const BUDGET_TEMPLATE: [string, number][] = [
  ["Gedung / tempat", 0.2],
  ["Katering", 0.3],
  ["Dekorasi", 0.1],
  ["Busana & rias", 0.08],
  ["Foto & video", 0.07],
  ["Mahar & seserahan", 0.08],
  ["Cincin", 0.05],
  ["Undangan & souvenir", 0.05],
  ["KUA & administrasi", 0.01],
  ["Hiburan / MC", 0.03],
  ["Cadangan", 0.03],
];

const TASK_TEMPLATE: [string, string][] = [
  ["12 bulan", "Tentukan tanggal & perkiraan budget"],
  ["12 bulan", "Diskusi konsep & jumlah tamu"],
  ["9 bulan", "Booking gedung / tempat"],
  ["9 bulan", "Pilih katering & tes rasa"],
  ["6 bulan", "Booking fotografer & videografer"],
  ["6 bulan", "Pilih vendor dekorasi"],
  ["6 bulan", "Fitting busana & pilih MUA"],
  ["3 bulan", "Daftar ke KUA & lengkapi berkas"],
  ["3 bulan", "Pesan undangan & souvenir"],
  ["3 bulan", "Beli cincin"],
  ["2 bulan", "Siapkan mahar & seserahan"],
  ["1 bulan", "Sebar undangan"],
  ["1 bulan", "Final meeting semua vendor"],
  ["1 minggu", "Konfirmasi jumlah tamu ke katering"],
  ["1 minggu", "Siapkan amplop & pembayaran vendor"],
  ["H-1", "Istirahat yang cukup 🤍"],
];

const PRANIKAH_TEMPLATE: [string, string][] = [
  ["Berkas KUA", "Daftar online di simkah.kemenag.go.id"],
  ["Berkas KUA", "Surat pengantar nikah dari kelurahan/desa (N1–N4)"],
  ["Berkas KUA", "Fotokopi KTP & KK kedua calon"],
  ["Berkas KUA", "Fotokopi akta kelahiran / ijazah terakhir"],
  ["Berkas KUA", "Pas foto 2×3 & 4×6 latar biru"],
  ["Berkas KUA", "Rekomendasi nikah dari KUA asal (kalau nikah di luar kecamatan)"],
  ["Berkas KUA", "Surat izin orang tua (kalau di bawah 21 tahun)"],
  ["Berkas KUA", "Bayar biaya nikah (gratis di KUA saat jam kerja)"],
  ["Kesehatan", "Cek kesehatan pranikah di puskesmas (darah, golongan darah, dll.)"],
  ["Kesehatan", "Imunisasi TT untuk calon istri"],
  ["Kesehatan", "Surat keterangan sehat"],
  ["Bekal", "Ikut Bimbingan Perkawinan (Bimwin) / kursus calon pengantin"],
  ["Bekal", "Belajar fiqih nikah: rukun, mahar, hak & kewajiban"],
  ["Bekal", "Pastikan wali nikah & dua saksi"],
];

const TALKS: { topic: string; q: string[] }[] = [
  { topic: "💰 Keuangan", q: ["Gaji digabung, dipisah, atau sebagian?", "Ada utang/cicilan yang perlu diceritakan?", "Berapa yang ditabung tiap bulan & untuk apa?", "Seberapa besar bantu keluarga masing-masing?"] },
  { topic: "🏠 Tempat tinggal", q: ["Setelah nikah tinggal di mana?", "Ngontrak, KPR, atau tinggal dengan orang tua dulu?"] },
  { topic: "🤲 Ibadah", q: ["Target ibadah bersama (shalat berjamaah, ngaji, kajian)?", "Siapa yang jadi pengingat kalau salah satu sedang turun?"] },
  { topic: "👶 Anak", q: ["Ingin punya anak kapan & berapa?", "Pola asuh seperti apa yang kita mau?"] },
  { topic: "💼 Karier & mimpi", q: ["Apa rencana karier masing-masing 5 tahun ke depan?", "Kalau ada tawaran kerja di kota lain, bagaimana?"] },
  { topic: "👨‍👩‍👧 Keluarga besar", q: ["Lebaran & liburan dibagi bagaimana?", "Batas keterlibatan keluarga dalam keputusan kita?"] },
  { topic: "🤝 Saat berselisih", q: ["Kalau marah, butuh waktu sendiri atau langsung dibicarakan?", "Hal kecil apa yang bikin kamu merasa dihargai?"] },
];

export default function NikahPage() {
  const userId = useAuth((s) => s.userId);
  const metaItem = (useItems(userId, "wed-meta") ?? [])[0];
  const budgets = useItems(userId, "wed-budget") ?? [];
  const tasks = useItems(userId, "wed-task") ?? [];
  const seserahan = useItems(userId, "wed-seserahan") ?? [];
  const guests = useItems(userId, "wed-guest") ?? [];
  const pranikah = useItems(userId, "wed-pranikah") ?? [];
  const talks = useItems(userId, "wed-talk") ?? [];
  const meta = parsePayload<Meta>(metaItem?.payload, { budget: 0, venue: "" });
  const [editMeta, setEditMeta] = useState(false);

  const planned = budgets.reduce((s, b) => s + (b.amount ?? 0), 0);
  const spent = budgets.reduce((s, b) => s + parsePayload<BudgetPayload>(b.payload, { spent: 0, vendor: "" }).spent, 0);
  const totalBudget = meta.budget || planned;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const guestCount = guests.reduce((s, g) => s + parsePayload<GuestPayload>(g.payload, { side: "bersama", count: 1, rsvp: "belum" }).count, 0);
  const daysLeft = metaItem?.date ? daysBetween(isoDay(new Date()), metaItem.date) : null;

  return (
    <div>
      <AppHeader title="Rencana nikah" />
      <div className="px-5 pb-8 pt-3">
        {/* Countdown hero */}
        <button
          onClick={() => setEditMeta(true)}
          className="pressable relative block w-full overflow-hidden rounded-[24px] p-5 text-left text-white shadow-float"
          style={{ background: "linear-gradient(135deg,#b76e79,#e8a3a3 55%,#f3cf9f)" }}
        >
          <span aria-hidden className="absolute -right-2 -top-3 text-[80px] opacity-20">💍</span>
          <div className="text-[13px] font-semibold text-white/85">
            {metaItem?.date
              ? fromIsoDay(metaItem.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
              : "Tap untuk isi tanggal hari H"}
          </div>
          <div className="mt-1 text-[30px] font-extrabold leading-tight">
            {daysLeft == null
              ? "Hari bahagia kalian"
              : daysLeft > 0
                ? `${daysLeft} hari lagi`
                : daysLeft === 0
                  ? "Hari ini! 💐"
                  : "Selamat menempuh hidup baru 💕"}
          </div>
          {meta.venue && <div className="text-[13px] text-white/85">📍 {meta.venue}</div>}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Persiapan" value={`${doneTasks}/${tasks.length || 0}`} />
            <Stat label="Terpakai" value={formatRupiahShort(spent)} />
            <Stat label="Tamu" value={`${guestCount}`} />
          </div>
        </button>

        {totalBudget > 0 && (
          <div className="surface mt-4 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] font-bold text-text-1">Anggaran</span>
              <span className="font-mono text-[13px] text-text-3">
                {formatRupiahShort(spent)} / {formatRupiahShort(totalBudget)}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-bg-elev2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (spent / totalBudget) * 100)}%`,
                  background: spent > totalBudget ? "var(--negative)" : "linear-gradient(90deg,#b76e79,#f3cf9f)",
                }}
              />
            </div>
          </div>
        )}

        <SectionTabs storageKey="nikah">
          {userId && <BudgetSection userId={userId} items={budgets} totalBudget={meta.budget} />}
          {userId && <TaskSection userId={userId} items={tasks} />}
          {userId && <SeserahanSection userId={userId} items={seserahan} />}
          {userId && <GuestSection userId={userId} items={guests} />}
          {userId && <PranikahSection userId={userId} items={pranikah} talks={talks} />}
        </SectionTabs>
      </div>

      {editMeta && userId && (
        <MetaSheet userId={userId} item={metaItem} meta={meta} onClose={() => setEditMeta(false)} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/20 py-2 backdrop-blur">
      <div className="font-mono text-[16px] font-extrabold">{value}</div>
      <div className="text-[11px] text-white/85">{label}</div>
    </div>
  );
}

function MetaSheet({
  userId,
  item,
  meta,
  onClose,
}: {
  userId: string;
  item?: ItemRecord;
  meta: Meta;
  onClose: () => void;
}) {
  const [date, setDate] = useState(item?.date ?? "");
  const [budget, setBudget] = useState(meta.budget ? String(meta.budget) : "");
  const [venue, setVenue] = useState(meta.venue);
  async function save() {
    await upsertItem(userId, {
      id: item?.id,
      kind: "wed-meta",
      title: "Pernikahan",
      date: date || undefined,
      payload: JSON.stringify({ budget: Number(budget.replace(/\D/g, "")) || 0, venue: venue.trim() }),
    });
    hapticSuccess();
    onClose();
  }
  return (
    <Sheet
      title="Hari H"
      onClose={onClose}
      footer={<button onClick={save} className="btn-accent w-full">Simpan</button>}
    >
      <Field label="Tanggal">
        <input type="date" className="input-base" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Total budget">
        <input
          className="input-base"
          inputMode="numeric"
          placeholder="Rp 0"
          value={budget ? formatRupiah(Number(budget.replace(/\D/g, "")) || 0) : ""}
          onChange={(e) => setBudget(e.target.value)}
        />
      </Field>
      <Field label="Tempat">
        <input className="input-base" placeholder="Gedung / rumah / masjid" value={venue} onChange={(e) => setVenue(e.target.value)} />
      </Field>
    </Sheet>
  );
}

function BudgetSection({ userId, items, totalBudget }: { userId: string; items: ItemRecord[]; totalBudget: number }) {
  const [edit, setEdit] = useState<ItemRecord | "new" | null>(null);
  async function seed() {
    for (const [title, pct] of BUDGET_TEMPLATE) {
      await upsertItem(userId, {
        kind: "wed-budget",
        title,
        amount: totalBudget ? Math.round((totalBudget * pct) / 100_000) * 100_000 : 0,
        payload: JSON.stringify({ spent: 0, vendor: "" }),
      });
    }
    hapticSuccess();
  }
  return (
    <Section
      title="Anggaran"
      caption={`${items.length} pos`}
      action={<AccentBtn onClick={() => setEdit("new")}>+ Pos</AccentBtn>}
    >
      {items.length === 0 ? (
        <div className="space-y-3">
          <Empty>Belum ada pos anggaran.</Empty>
          <button onClick={seed} className="btn-accent w-full">
            Pakai daftar pos umum
          </button>
        </div>
      ) : (
        <ListBox>
          {items.map((b) => {
            const p = parsePayload<BudgetPayload>(b.payload, { spent: 0, vendor: "" });
            const over = (b.amount ?? 0) > 0 && p.spent > (b.amount ?? 0);
            return (
              <button key={b.id} onClick={() => setEdit(b)} className="block w-full py-3 text-left">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[14px] font-semibold text-text-1">{b.title}</span>
                  <span className={`font-mono text-[12px] ${over ? "text-[color:var(--negative)]" : "text-text-3"}`}>
                    {formatRupiahShort(p.spent)} / {formatRupiahShort(b.amount ?? 0)}
                  </span>
                </div>
                {p.vendor && <div className="text-[12px] text-text-4">{p.vendor}</div>}
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-elev2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(b.amount ?? 0) > 0 ? Math.min(100, (p.spent / (b.amount ?? 1)) * 100) : 0}%`,
                      background: over ? "var(--negative)" : "#b76e79",
                    }}
                  />
                </div>
              </button>
            );
          })}
        </ListBox>
      )}
      {edit && (
        <BudgetSheet userId={userId} item={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />
      )}
    </Section>
  );
}

function BudgetSheet({ userId, item, onClose }: { userId: string; item?: ItemRecord; onClose: () => void }) {
  const p = parsePayload<BudgetPayload>(item?.payload, { spent: 0, vendor: "" });
  const [title, setTitle] = useState(item?.title ?? "");
  const [plan, setPlan] = useState(item?.amount ? String(item.amount) : "");
  const [spent, setSpent] = useState(p.spent ? String(p.spent) : "");
  const [vendor, setVendor] = useState(p.vendor);
  const n = (s: string) => Number(s.replace(/\D/g, "")) || 0;
  async function save() {
    if (!title.trim()) return;
    await upsertItem(userId, {
      id: item?.id,
      kind: "wed-budget",
      title: title.trim(),
      amount: n(plan),
      payload: JSON.stringify({ spent: n(spent), vendor: vendor.trim() }),
    });
    onClose();
  }
  return (
    <Sheet
      title={item ? item.title : "Pos baru"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {item && (
            <button
              onClick={async () => {
                await deleteItem(userId, item.id);
                onClose();
              }}
              className="btn-danger"
            >
              Hapus
            </button>
          )}
          <button onClick={save} className="btn-accent flex-1">Simpan</button>
        </div>
      }
    >
      <Field label="Nama pos">
        <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Katering" />
      </Field>
      <Field label="Rencana">
        <input className="input-base" inputMode="numeric" value={plan ? formatRupiah(n(plan)) : ""} onChange={(e) => setPlan(e.target.value)} placeholder="Rp 0" />
      </Field>
      <Field label="Sudah dibayar">
        <input className="input-base" inputMode="numeric" value={spent ? formatRupiah(n(spent)) : ""} onChange={(e) => setSpent(e.target.value)} placeholder="Rp 0" />
      </Field>
      <Field label="Vendor">
        <input className="input-base" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Opsional" />
      </Field>
    </Sheet>
  );
}

function TaskSection({ userId, items }: { userId: string; items: ItemRecord[] }) {
  const [title, setTitle] = useState("");
  const groups = useMemo(() => {
    const order = TASK_TEMPLATE.map(([g]) => g).filter((g, i, a) => a.indexOf(g) === i);
    const map = new Map<string, ItemRecord[]>();
    for (const t of items) {
      const g = t.due || "Lainnya";
      map.set(g, [...(map.get(g) ?? []), t]);
    }
    return Array.from(map.entries()).sort(
      ([a], [b]) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)),
    );
  }, [items]);

  async function seed() {
    for (const [due, t] of TASK_TEMPLATE) {
      await upsertItem(userId, { kind: "wed-task", title: t, due, status: "todo" });
    }
    hapticSuccess();
  }
  async function add() {
    if (!title.trim()) return;
    await upsertItem(userId, { kind: "wed-task", title: title.trim(), due: "Lainnya", status: "todo" });
    setTitle("");
  }
  async function toggle(t: ItemRecord) {
    await upsertItem(userId, { ...t, status: t.status === "done" ? "todo" : "done" });
    hapticTap();
  }

  return (
    <Section title="Persiapan" caption={`${items.filter((t) => t.status === "done").length} dari ${items.length} selesai`}>
      <div className="mb-3 flex gap-2">
        <input
          className="input-base h-11 flex-1"
          placeholder="Tambah persiapan…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <AccentBtn onClick={add} disabled={!title.trim()}>+</AccentBtn>
      </div>
      {items.length === 0 ? (
        <div className="space-y-3">
          <Empty>Belum ada daftar persiapan.</Empty>
          <button onClick={seed} className="btn-accent w-full">Pakai daftar persiapan standar</button>
        </div>
      ) : (
        groups.map(([g, list]) => (
          <div key={g} className="mb-4">
            <div className="mb-1.5 text-[12px] font-bold text-text-3">{g.startsWith("H") || g === "Lainnya" ? g : `${g} sebelum`}</div>
            <ListBox>
              {list.map((t) => (
                <SwipeRow key={t.id} onDelete={() => deleteItem(userId, t.id)}>
                  <button onClick={() => toggle(t)} className="flex w-full items-center gap-3 bg-bg-card py-3 text-left">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-[12px] ${t.status === "done" ? "border-[#b76e79] bg-[#b76e79] text-white" : "border-border-strong text-transparent"}`}>✓</span>
                    <span className={`text-[14px] ${t.status === "done" ? "text-text-4 line-through" : "text-text-1"}`}>{t.title}</span>
                  </button>
                </SwipeRow>
              ))}
            </ListBox>
          </div>
        ))
      )}
    </Section>
  );
}

function SeserahanSection({ userId, items }: { userId: string; items: ItemRecord[] }) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const total = items.reduce((s, i) => s + (i.amount ?? 0), 0);
  async function add() {
    if (!title.trim()) return;
    await upsertItem(userId, {
      kind: "wed-seserahan",
      title: title.trim(),
      amount: Number(price.replace(/\D/g, "")) || 0,
      status: "todo",
    });
    setTitle("");
    setPrice("");
  }
  return (
    <Section title="Seserahan" caption={`${items.filter((i) => i.status === "done").length}/${items.length} siap · ${formatRupiahShort(total)}`}>
      <div className="mb-3 flex gap-2">
        <input className="input-base h-11 flex-1" placeholder="Alat sholat, sepatu…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input-base h-11 w-28" inputMode="numeric" placeholder="Harga" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
        <AccentBtn onClick={add} disabled={!title.trim()}>+</AccentBtn>
      </div>
      {items.length === 0 ? (
        <Empty>Daftar seserahan masih kosong.</Empty>
      ) : (
        <ListBox>
          {items.map((i) => (
            <SwipeRow key={i.id} onDelete={() => deleteItem(userId, i.id)}>
              <button
                onClick={() => upsertItem(userId, { ...i, status: i.status === "done" ? "todo" : "done" })}
                className="flex w-full items-center gap-3 bg-bg-card py-3 text-left"
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-[12px] ${i.status === "done" ? "border-[#b76e79] bg-[#b76e79] text-white" : "border-border-strong text-transparent"}`}>✓</span>
                <span className={`flex-1 text-[14px] ${i.status === "done" ? "text-text-4 line-through" : "text-text-1"}`}>{i.title}</span>
                {(i.amount ?? 0) > 0 && <span className="font-mono text-[12px] text-text-3">{formatRupiahShort(i.amount ?? 0)}</span>}
              </button>
            </SwipeRow>
          ))}
        </ListBox>
      )}
    </Section>
  );
}

function GuestSection({ userId, items }: { userId: string; items: ItemRecord[] }) {
  const [name, setName] = useState("");
  const [side, setSide] = useState<GuestPayload["side"]>("bersama");
  const [count, setCount] = useState(1);
  const parse = (g: ItemRecord) => parsePayload<GuestPayload>(g.payload, { side: "bersama", count: 1, rsvp: "belum" });
  const total = items.reduce((s, g) => s + parse(g).count, 0);
  const yes = items.filter((g) => parse(g).rsvp === "ya").reduce((s, g) => s + parse(g).count, 0);

  async function add() {
    if (!name.trim()) return;
    await upsertItem(userId, {
      kind: "wed-guest",
      title: name.trim(),
      payload: JSON.stringify({ side, count, rsvp: "belum" } satisfies GuestPayload),
    });
    setName("");
    setCount(1);
  }
  async function cycleRsvp(g: ItemRecord) {
    const p = parse(g);
    const next = p.rsvp === "belum" ? "ya" : p.rsvp === "ya" ? "tidak" : "belum";
    await upsertItem(userId, { ...g, payload: JSON.stringify({ ...p, rsvp: next }) });
    hapticTap();
  }

  return (
    <Section title="Tamu" caption={`${total} orang · ${yes} pasti datang`}>
      <div className="mb-2 flex gap-2">
        <input className="input-base h-11 flex-1" placeholder="Nama / keluarga" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input className="input-base h-11 w-16 text-center" inputMode="numeric" value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))} aria-label="Jumlah orang" />
        <AccentBtn onClick={add} disabled={!name.trim()}>+</AccentBtn>
      </div>
      <div className="mb-3">
        <Chips
          options={[
            { value: "pria" as const, label: "Pihak pria" },
            { value: "wanita" as const, label: "Pihak wanita" },
            { value: "bersama" as const, label: "Teman bersama" },
          ]}
          value={side}
          onChange={setSide}
        />
      </div>
      {items.length === 0 ? (
        <Empty>Belum ada tamu. Tap status untuk ubah konfirmasi.</Empty>
      ) : (
        <ListBox>
          {items.map((g) => {
            const p = parse(g);
            return (
              <SwipeRow key={g.id} onDelete={() => deleteItem(userId, g.id)}>
                <div className="flex items-center gap-3 bg-bg-card py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] text-text-1">{g.title}</div>
                    <div className="text-[12px] text-text-4">
                      {p.count} orang · {p.side === "pria" ? "pihak pria" : p.side === "wanita" ? "pihak wanita" : "teman bersama"}
                    </div>
                  </div>
                  <button
                    onClick={() => cycleRsvp(g)}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
                      p.rsvp === "ya"
                        ? "bg-positive-bg text-[color:var(--positive)]"
                        : p.rsvp === "tidak"
                          ? "bg-negative-bg text-[color:var(--negative)]"
                          : "bg-bg-elev2 text-text-3"
                    }`}
                  >
                    {p.rsvp === "ya" ? "Datang" : p.rsvp === "tidak" ? "Tidak" : "Belum tahu"}
                  </button>
                </div>
              </SwipeRow>
            );
          })}
        </ListBox>
      )}
    </Section>
  );
}

function PranikahSection({ userId, items, talks }: { userId: string; items: ItemRecord[]; talks: ItemRecord[] }) {
  const groups = ["Berkas KUA", "Kesehatan", "Bekal"];
  const discussed = new Set(talks.filter((t) => t.status === "done").map((t) => t.title));
  const totalQ = TALKS.reduce((s, t) => s + t.q.length, 0);

  async function seed() {
    for (const [due, t] of PRANIKAH_TEMPLATE) await upsertItem(userId, { kind: "wed-pranikah", title: t, due, status: "todo" });
    hapticSuccess();
  }
  async function toggle(t: ItemRecord) {
    await upsertItem(userId, { ...t, status: t.status === "done" ? "todo" : "done" });
    hapticTap();
  }
  async function toggleTalk(q: string) {
    const existing = talks.find((t) => t.title === q);
    if (existing) await upsertItem(userId, { ...existing, status: existing.status === "done" ? "todo" : "done" });
    else await upsertItem(userId, { kind: "wed-talk", title: q, status: "done" });
    hapticTap();
  }

  return (
    <Section title="Pranikah" caption={`${items.filter((t) => t.status === "done").length}/${items.length} berkas · ${discussed.size}/${totalQ} obrolan`}>
      {items.length === 0 ? (
        <div className="mb-5 space-y-3">
          <Empty>Daftar berkas KUA, cek kesehatan, dan bekal sebelum akad.</Empty>
          <button onClick={seed} className="btn-accent w-full">Pakai daftar pranikah</button>
        </div>
      ) : (
        groups.map((g) => {
          const list = items.filter((t) => (t.due || "Bekal") === g);
          if (!list.length) return null;
          return (
            <div key={g} className="mb-4">
              <div className="mb-1.5 text-[12px] font-bold text-text-3">{g}</div>
              <ListBox>
                {list.map((t) => (
                  <SwipeRow key={t.id} onDelete={() => deleteItem(userId, t.id)}>
                    <button onClick={() => toggle(t)} className="flex w-full items-center gap-3 bg-bg-card py-3 text-left">
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-[12px] ${t.status === "done" ? "border-[#b76e79] bg-[#b76e79] text-white" : "border-border-strong text-transparent"}`}>✓</span>
                      <span className={`text-[14px] ${t.status === "done" ? "text-text-4 line-through" : "text-text-1"}`}>{t.title}</span>
                    </button>
                  </SwipeRow>
                ))}
              </ListBox>
            </div>
          );
        })
      )}
      <p className="-mt-1 mb-5 text-[11px] leading-snug text-text-4">
        Syarat bisa berbeda tiap daerah — pastikan lagi ke KUA kecamatan kalian.
      </p>

      <div className="mb-1 text-[15px] font-extrabold text-text-1">Obrolan sebelum akad</div>
      <p className="mb-3 text-[12px] text-text-3">Bahas pelan-pelan, satu topik per kencan. Centang kalau sudah sepakat.</p>
      {TALKS.map((t) => (
        <div key={t.topic} className="mb-4">
          <div className="mb-1.5 text-[12px] font-bold text-text-3">{t.topic}</div>
          <ListBox>
            {t.q.map((q) => (
              <button key={q} onClick={() => toggleTalk(q)} className="flex w-full items-center gap-3 bg-bg-card py-3 text-left">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-[12px] ${discussed.has(q) ? "border-[#b76e79] bg-[#b76e79] text-white" : "border-border-strong text-transparent"}`}>✓</span>
                <span className={`text-[14px] ${discussed.has(q) ? "text-text-3" : "text-text-1"}`}>{q}</span>
              </button>
            ))}
          </ListBox>
        </div>
      ))}
    </Section>
  );
}
