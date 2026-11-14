"use client";

import { useId, useState } from "react";
import { Check, X } from "lucide-react";
import { AppHeader } from "@/components/shell/AppHeader";
import {
  AccentBtn,
  Empty,
  GhostBtn,
  ListBox,
  Section,
  SectionTabs,
} from "@/components/tracker/Section";
import { useAuth } from "@/stores/auth";
import {
  deleteEntry,
  deleteItem,
  upsertEntry,
  upsertItem,
  useEntries,
  useItems,
} from "@/stores/data";
import { todayISO, formatDateShort, formatRupiah } from "@/lib/utils";

const DREAM_FEELS: { value: number; label: string }[] = [
  { value: 1, label: "Buruk" },
  { value: 2, label: "Cemas" },
  { value: 3, label: "Biasa" },
  { value: 4, label: "Baik" },
  { value: 5, label: "Indah" },
];

export default function ListPage() {
  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="List"
      />

      <div className="px-5">
        <SectionTabs storageKey="list">
        <WishlistSection />
        <GiftIdeaSection />
        <MediaSection />
        <OotdSection />
        <SkincareSection />
        <ResolutionSection />
        <DreamSection />
        <DonationSection />
        </SectionTabs>
      </div>
    </div>
  );
}

function WishlistSection() {
  const uid = useId();
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "wishlist") ?? [];
  const [t, setT] = useState("");
  const [price, setPrice] = useState("");
  const [pri, setPri] = useState("med");

  async function save() {
    if (!userId || !t) return;
    await upsertItem(userId, {
      kind: "wishlist",
      title: t,
      amount: price ? Number(price) : undefined,
      status: "wish",
      payload: JSON.stringify({ priority: pri }),
    });
    setT("");
    setPrice("");
  }

  async function bought(id: string) {
    if (!userId) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    await upsertItem(userId, {
      ...it,
      status: it.status === "bought" ? "wish" : "bought",
      date: it.status === "bought" ? undefined : todayISO(),
    });
  }

  return (
    <Section
      title="Wishlist"
      caption={`${items.filter((i) => i.status !== "bought").length} barang diinginkan`}
      defaultOpen
    >
      <div className="form-card">
        <div className="space-y-2">
          <label htmlFor={`${uid}-title`} className="sr-only">
            Nama barang wishlist
          </label>
          <input
            id={`${uid}-title`}
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Barang yang diinginkan"
            className="w-full bg-transparent text-[13px]"
          />
          <div className="flex gap-2">
            <label htmlFor={`${uid}-price`} className="sr-only">
              Perkiraan harga
            </label>
            <input
              id={`${uid}-price`}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Harga"
              className="flex-1 bg-transparent text-[13px]"
            />
            <label htmlFor={`${uid}-pri`} className="sr-only">
              Prioritas
            </label>
            <select
              id={`${uid}-pri`}
              value={pri}
              onChange={(e) => setPri(e.target.value)}
              className="min-h-[44px] bg-transparent text-[13px] text-text-2"
            >
              <option value="low">Rendah</option>
              <option value="med">Sedang</option>
              <option value="high">Tinggi</option>
            </select>
            <AccentBtn onClick={save} disabled={!t} aria-label="Tambah wishlist">
              Tambah
            </AccentBtn>
          </div>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty>Wishlist barang.</Empty>
      ) : (
        <ListBox>
          {items.map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            const bought_ = it.status === "bought";
            return (
              <div key={it.id} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  aria-pressed={bought_}
                  aria-label={`${bought_ ? "Buka lagi" : "Tandai sudah dibeli"} ${it.title}`}
                  onClick={() => bought(it.id)}
                  className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-bg-elev1"
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-5 w-5 place-items-center rounded border ${
                      bought_ ? "border-accent bg-accent text-accent-fg" : "border-border"
                    }`}
                  >
                    {bought_ && <Check size={14} strokeWidth={2.5} />}
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[13px] ${
                      bought_ ? "text-text-3 line-through" : ""
                    }`}
                  >
                    {it.title}
                  </div>
                  <div className="text-[12px] text-text-3">
                    {it.amount ? formatRupiah(it.amount) : "Belum ada harga"}
                    {p.priority ? ` · ${p.priority}` : ""}
                  </div>
                </div>
                <GhostBtn aria-label={`Hapus ${it.title}`} onClick={() => userId && deleteItem(userId, it.id)}>
                  <X size={16} aria-hidden="true" />
                </GhostBtn>
              </div>
            );
          })}
        </ListBox>
      )}
    </Section>
  );
}

function GiftIdeaSection() {
  const uid = useId();
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "gift") ?? [];
  const [t, setT] = useState("");
  const [forWho, setFor] = useState("");

  async function save() {
    if (!userId || !t || !forWho) return;
    await upsertItem(userId, {
      kind: "gift",
      title: t,
      who: forWho,
    });
    setT("");
    setFor("");
  }

  return (
    <Section title="Ide kado" caption={`${items.length} ide`}>
      <div className="form-card">
        <div className="flex flex-wrap gap-2">
          <label htmlFor={`${uid}-idea`} className="sr-only">
            Ide kado
          </label>
          <input
            id={`${uid}-idea`}
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Ide kado"
            className="min-w-[120px] flex-1 bg-transparent text-[13px]"
          />
          <label htmlFor={`${uid}-who`} className="sr-only">
            Untuk siapa
          </label>
          <input
            id={`${uid}-who`}
            value={forWho}
            onChange={(e) => setFor(e.target.value)}
            placeholder="Untuk siapa"
            className="w-28 bg-transparent text-[13px]"
          />
          <AccentBtn onClick={save} disabled={!t || !forWho} aria-label="Tambah ide kado">
            Tambah
          </AccentBtn>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty>Catat ide kado biar tidak lupa.</Empty>
      ) : (
        <ListBox>
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13px]">{it.title}</div>
                <div className="text-[12px] text-text-3">
                  untuk {it.who}
                </div>
              </div>
              <GhostBtn aria-label={`Hapus ${it.title}`} onClick={() => userId && deleteItem(userId, it.id)}>
                <X size={16} aria-hidden="true" />
              </GhostBtn>
            </div>
          ))}
        </ListBox>
      )}
    </Section>
  );
}

function MediaSection() {
  const uid = useId();
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "media") ?? [];
  const [t, setT] = useState("");
  const [type, setType] = useState("film");

  async function save() {
    if (!userId || !t) return;
    await upsertItem(userId, {
      kind: "media",
      title: t,
      status: "todo",
      payload: JSON.stringify({ type }),
    });
    setT("");
  }

  async function rate(id: string, n: number) {
    if (!userId) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const p = JSON.parse(it.payload ?? "{}");
    await upsertItem(userId, {
      ...it,
      status: "done",
      date: todayISO(),
      payload: JSON.stringify({ ...p, rating: n }),
    });
  }

  const todo = items.filter((i) => i.status !== "done");
  const done = items.filter((i) => i.status === "done");

  return (
    <Section
      title="Film / Podcast"
      caption={`${todo.length} mau ditonton · ${done.length} selesai`}
    >
      <div className="form-card">
        <div className="flex flex-wrap gap-2">
          <label htmlFor={`${uid}-title`} className="sr-only">
            Judul film atau podcast
          </label>
          <input
            id={`${uid}-title`}
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Judul"
            className="min-w-[120px] flex-1 bg-transparent text-[13px]"
          />
          <label htmlFor={`${uid}-type`} className="sr-only">
            Jenis tontonan
          </label>
          <select
            id={`${uid}-type`}
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="min-h-[44px] bg-transparent text-[13px] text-text-2"
          >
            <option value="film">Film</option>
            <option value="serial">Serial</option>
            <option value="podcast">Podcast</option>
          </select>
          <AccentBtn onClick={save} disabled={!t} aria-label="Tambah daftar tonton">
            Tambah
          </AccentBtn>
        </div>
      </div>
      {[...todo, ...done].length > 0 && (
        <ListBox>
          {[...todo, ...done].map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            const isDone = it.status === "done";
            return (
              <div key={it.id} className="py-2.5">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[13px] ${
                        isDone ? "text-text-3" : ""
                      }`}
                    >
                      {it.title}
                    </div>
                    <div className="text-[12px] text-text-3">
                      {p.type}
                      {isDone && p.rating ? ` · rating ${p.rating}/5` : ""}
                    </div>
                  </div>
                  <GhostBtn aria-label={`Hapus ${it.title}`} onClick={() => userId && deleteItem(userId, it.id)}>
                    <X size={16} aria-hidden="true" />
                  </GhostBtn>
                </div>
                {!isDone && (
                  <div className="mt-2 flex items-center gap-1.5" role="group" aria-label={`Beri rating ${it.title}`}>
                    <span className="mr-1 text-[12px] text-text-3">Skor:</span>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`Beri rating ${n} dari 5`}
                        onClick={() => rate(it.id, n)}
                        className="h-11 min-w-[44px] flex-1 rounded-md border border-border text-[13px] font-semibold text-text-2 transition-colors hover:bg-bg-elev1 active:scale-95"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </ListBox>
      )}
    </Section>
  );
}

function OotdSection() {
  const uid = useId();
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, "ootd") ?? [];
  const [text, setText] = useState("");

  async function add() {
    if (!userId || !text.trim()) return;
    await upsertEntry(userId, {
      kind: "ootd",
      date: todayISO(),
      valueText: text.trim(),
    });
    setText("");
  }

  return (
    <Section title="OOTD" caption={`${entries.length} catatan`}>
      <div className="form-card">
        <div className="flex gap-2">
          <label htmlFor={`${uid}-ootd`} className="sr-only">
            Outfit hari ini
          </label>
          <input
            id={`${uid}-ootd`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Outfit hari ini"
            className="flex-1 bg-transparent text-[13px]"
          />
          <AccentBtn onClick={add} disabled={!text.trim()}>
            Catat
          </AccentBtn>
        </div>
      </div>
      {entries.slice(0, 5).length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {entries.slice(0, 5).map((e) => (
            <div key={e.id} className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-[13px]">{e.valueText}</div>
                <div className="text-[12px] text-text-3">
                  {formatDateShort(e.date)}
                </div>
              </div>
              <GhostBtn onClick={() => userId && deleteEntry(userId, e.id)}>
                Hapus
              </GhostBtn>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function SkincareSection() {
  const uid = useId();
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "skincare") ?? [];
  const [t, setT] = useState("");
  const [step, setStep] = useState("toner");

  async function save() {
    if (!userId || !t) return;
    await upsertItem(userId, {
      kind: "skincare",
      title: t,
      status: "active",
      payload: JSON.stringify({ step }),
    });
    setT("");
  }

  return (
    <Section title="Skincare" caption={`${items.length} produk`}>
      <div className="form-card">
        <div className="flex flex-wrap gap-2">
          <label htmlFor={`${uid}-product`} className="sr-only">
            Nama produk skincare
          </label>
          <input
            id={`${uid}-product`}
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Nama produk"
            className="min-w-[120px] flex-1 bg-transparent text-[13px]"
          />
          <label htmlFor={`${uid}-step`} className="sr-only">
            Tahap skincare
          </label>
          <select
            id={`${uid}-step`}
            value={step}
            onChange={(e) => setStep(e.target.value)}
            className="min-h-[44px] bg-transparent text-[13px] text-text-2"
          >
            <option value="cleanser">Cleanser</option>
            <option value="toner">Toner</option>
            <option value="serum">Serum</option>
            <option value="moisturizer">Moisturizer</option>
            <option value="sunscreen">Sunscreen</option>
            <option value="treatment">Treatment</option>
          </select>
          <AccentBtn onClick={save} disabled={!t} aria-label="Tambah produk skincare">
            Tambah
          </AccentBtn>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty>Catat produk skincare yang dipakai.</Empty>
      ) : (
        <ListBox>
          {items.map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            return (
              <div key={it.id} className="flex items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px]">{it.title}</div>
                  <div className="text-[12px] text-text-3 capitalize">
                    {p.step}
                  </div>
                </div>
                <GhostBtn aria-label={`Hapus ${it.title}`} onClick={() => userId && deleteItem(userId, it.id)}>
                  <X size={16} aria-hidden="true" />
                </GhostBtn>
              </div>
            );
          })}
        </ListBox>
      )}
    </Section>
  );
}

function ResolutionSection() {
  const uid = useId();
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "resolution") ?? [];
  const [t, setT] = useState("");
  const year = new Date().getFullYear();

  async function save() {
    if (!userId || !t) return;
    await upsertItem(userId, {
      kind: "resolution",
      title: t,
      status: "active",
      payload: JSON.stringify({ year }),
    });
    setT("");
  }

  async function toggle(id: string) {
    if (!userId) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    await upsertItem(userId, {
      ...it,
      status: it.status === "done" ? "active" : "done",
      date: it.status === "done" ? undefined : todayISO(),
    });
  }

  const thisYear = items.filter((it) => {
    const p = JSON.parse(it.payload ?? "{}");
    return p.year === year;
  });
  const done = thisYear.filter((it) => it.status === "done").length;

  return (
    <Section
      title={`Resolusi ${year}`}
      caption={`${done}/${thisYear.length} tercapai`}
    >
      <div className="form-card">
        <div className="flex gap-2">
          <label htmlFor={`${uid}-res`} className="sr-only">
            Resolusi tahun ini
          </label>
          <input
            id={`${uid}-res`}
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Resolusi tahun ini"
            className="flex-1 bg-transparent text-[13px]"
          />
          <AccentBtn onClick={save} disabled={!t} aria-label="Tambah resolusi">
            Tambah
          </AccentBtn>
        </div>
      </div>
      {thisYear.length > 0 && (
        <ListBox>
          {thisYear.map((it) => {
            const isDone = it.status === "done";
            return (
              <div key={it.id} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  aria-pressed={isDone}
                  aria-label={`${isDone ? "Buka lagi" : "Tandai tercapai"} ${it.title}`}
                  onClick={() => toggle(it.id)}
                  className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-bg-elev1"
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-5 w-5 place-items-center rounded border ${
                      isDone ? "border-accent bg-accent text-accent-fg" : "border-border"
                    }`}
                  >
                    {isDone && <Check size={14} strokeWidth={2.5} />}
                  </span>
                </button>
                <div
                  className={`min-w-0 flex-1 text-[13px] ${
                    isDone ? "text-text-3 line-through" : ""
                  }`}
                >
                  {it.title}
                </div>
                <GhostBtn aria-label={`Hapus ${it.title}`} onClick={() => userId && deleteItem(userId, it.id)}>
                  <X size={16} aria-hidden="true" />
                </GhostBtn>
              </div>
            );
          })}
        </ListBox>
      )}
    </Section>
  );
}

function DreamSection() {
  const uid = useId();
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, "dream") ?? [];
  const [text, setText] = useState("");
  const [feel, setFeel] = useState(3);

  async function add() {
    if (!userId || !text.trim()) return;
    await upsertEntry(userId, {
      kind: "dream",
      date: todayISO(),
      valueText: text.trim(),
      valueNum: feel,
    });
    setText("");
  }

  return (
    <Section title="Mimpi" caption={`${entries.length} mimpi tercatat`}>
      <div className="form-card">
        <label htmlFor={`${uid}-dream`} className="sr-only">
          Catatan mimpi
        </label>
        <textarea
          id={`${uid}-dream`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mimpi yang diingat..."
          rows={2}
          className="w-full resize-none bg-transparent text-[13px]"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Perasaan saat mimpi">
            {DREAM_FEELS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={feel === f.value}
                onClick={() => setFeel(f.value)}
                className={`min-h-[44px] rounded-md border px-2.5 text-[12px] font-medium transition-colors ${
                  feel === f.value
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-text-3"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <AccentBtn onClick={add} disabled={!text.trim()}>
            Simpan
          </AccentBtn>
        </div>
      </div>
      {entries.slice(0, 5).length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {entries.slice(0, 5).map((e) => {
            const label = DREAM_FEELS.find((f) => f.value === (e.valueNum ?? 3))?.label ?? "Biasa";
            return (
              <div key={e.id} className="py-2.5">
                <div className="whitespace-pre-wrap text-[13px] text-text-1">
                  {e.valueText}
                </div>
                <div className="mt-0.5 flex items-center justify-between">
                  <div className="text-[12px] text-text-3">
                    {formatDateShort(e.date)} · {label}
                  </div>
                  <GhostBtn onClick={() => userId && deleteEntry(userId, e.id)}>
                    Hapus
                  </GhostBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function DonationSection() {
  const uid = useId();
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, "donation") ?? [];
  const [amount, setAmount] = useState("");
  const [cause, setCause] = useState("");

  async function add() {
    if (!userId || !amount || !cause) return;
    await upsertEntry(userId, {
      kind: "donation",
      date: todayISO(),
      valueNum: Number(amount),
      valueText: cause,
    });
    setAmount("");
    setCause("");
  }

  const yearTotal = entries
    .filter((e) => e.date.startsWith(String(new Date().getFullYear())))
    .reduce((s, e) => s + (e.valueNum ?? 0), 0);

  return (
    <Section
      title="Sedekah & donasi"
      caption={`Tahun ini: ${formatRupiah(yearTotal)}`}
    >
      <div className="form-card">
        <div className="flex flex-wrap gap-2">
          <label htmlFor={`${uid}-cause`} className="sr-only">
            Tujuan sedekah atau donasi
          </label>
          <input
            id={`${uid}-cause`}
            value={cause}
            onChange={(e) => setCause(e.target.value)}
            placeholder="Untuk apa"
            className="min-w-[120px] flex-1 bg-transparent text-[13px]"
          />
          <label htmlFor={`${uid}-amt`} className="sr-only">
            Jumlah rupiah
          </label>
          <input
            id={`${uid}-amt`}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Rp"
            className="w-28 bg-transparent text-[13px]"
          />
          <AccentBtn onClick={add} disabled={!amount || !cause}>
            Catat
          </AccentBtn>
        </div>
      </div>
      {entries.slice(0, 5).length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {entries.slice(0, 5).map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13px]">{e.valueText}</div>
                <div className="text-[12px] text-text-3">
                  {formatDateShort(e.date)}
                </div>
              </div>
              <span className="text-[13px] tabular-nums">
                {formatRupiah(e.valueNum ?? 0)}
              </span>
              <GhostBtn onClick={() => userId && deleteEntry(userId, e.id)}>
                Hapus
              </GhostBtn>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
