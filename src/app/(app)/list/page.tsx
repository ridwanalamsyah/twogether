"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import {
  AccentBtn,
  Empty,
  GhostBtn,
  ListBox,
  Section,
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

export default function ListPage() {
  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="List"
        subtitle="Wishlist, gift, media, OOTD, skincare, resolusi, mimpi, donasi"
        actions={
          <Link
            href="/home"
            className="text-[12px] text-text-3 active:opacity-50"
          >
            Tutup
          </Link>
        }
      />

      <div className="px-5">
        <WishlistSection />
        <GiftIdeaSection />
        <MediaSection />
        <OotdSection />
        <SkincareSection />
        <ResolutionSection />
        <DreamSection />
        <DonationSection />
      </div>
    </div>
  );
}

function WishlistSection() {
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
      <div className="border-y border-border py-2.5">
        <div className="space-y-2">
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Barang yang diinginkan"
            className="w-full bg-transparent text-[13px] outline-none"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Harga"
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
            <select
              value={pri}
              onChange={(e) => setPri(e.target.value)}
              className="bg-transparent text-[13px] text-text-2 outline-none"
            >
              <option value="low">Rendah</option>
              <option value="med">Sedang</option>
              <option value="high">Tinggi</option>
            </select>
            <AccentBtn onClick={save} disabled={!t}>
              +
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
              <div key={it.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => bought(it.id)}
                  className={`h-5 w-5 rounded border ${
                    bought_ ? "border-accent bg-accent" : "border-border"
                  }`}
                />
                <div className="flex-1">
                  <div
                    className={`text-[13px] ${
                      bought_ ? "text-text-4 line-through" : ""
                    }`}
                  >
                    {it.title}
                  </div>
                  <div className="text-[11px] text-text-4">
                    {it.amount ? formatRupiah(it.amount) : "—"}
                    {p.priority ? ` · ${p.priority}` : ""}
                  </div>
                </div>
                <GhostBtn onClick={() => userId && deleteItem(userId, it.id)}>
                  ×
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
      <div className="border-y border-border py-2.5">
        <div className="flex gap-2">
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Ide kado"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          <input
            value={forWho}
            onChange={(e) => setFor(e.target.value)}
            placeholder="Untuk siapa"
            className="w-28 bg-transparent text-[13px] outline-none"
          />
          <AccentBtn onClick={save} disabled={!t || !forWho}>
            +
          </AccentBtn>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty>Catat ide kado biar nggak lupa.</Empty>
      ) : (
        <ListBox>
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 py-2.5">
              <div className="flex-1">
                <div className="text-[13px]">{it.title}</div>
                <div className="text-[11px] text-text-4">
                  untuk {it.who}
                </div>
              </div>
              <GhostBtn onClick={() => userId && deleteItem(userId, it.id)}>
                ×
              </GhostBtn>
            </div>
          ))}
        </ListBox>
      )}
    </Section>
  );
}

function MediaSection() {
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
      <div className="border-y border-border py-2.5">
        <div className="flex gap-2">
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Judul"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="bg-transparent text-[13px] text-text-2 outline-none"
          >
            <option value="film">Film</option>
            <option value="serial">Serial</option>
            <option value="podcast">Podcast</option>
          </select>
          <AccentBtn onClick={save} disabled={!t}>
            +
          </AccentBtn>
        </div>
      </div>
      {[...todo, ...done].length > 0 && (
        <ListBox>
          {[...todo, ...done].map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            const isDone = it.status === "done";
            return (
              <div key={it.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <div
                    className={`text-[13px] ${
                      isDone ? "text-text-3" : ""
                    }`}
                  >
                    {it.title}
                  </div>
                  <div className="text-[11px] text-text-4">
                    {p.type}
                    {isDone && p.rating ? ` · ${"★".repeat(p.rating)}` : ""}
                  </div>
                </div>
                {!isDone && (
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => rate(it.id, n)}
                        className="text-[14px] text-text-3 active:opacity-50"
                      >
                        ☆
                      </button>
                    ))}
                  </div>
                )}
                <GhostBtn onClick={() => userId && deleteItem(userId, it.id)}>
                  ×
                </GhostBtn>
              </div>
            );
          })}
        </ListBox>
      )}
    </Section>
  );
}

function OotdSection() {
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
      <div className="border-y border-border py-2.5">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Outfit hari ini"
            className="flex-1 bg-transparent text-[13px] outline-none"
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
                <div className="text-[11px] text-text-4">
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
      <div className="border-y border-border py-2.5">
        <div className="flex gap-2">
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Nama produk"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          <select
            value={step}
            onChange={(e) => setStep(e.target.value)}
            className="bg-transparent text-[13px] text-text-2 outline-none"
          >
            <option value="cleanser">Cleanser</option>
            <option value="toner">Toner</option>
            <option value="serum">Serum</option>
            <option value="moisturizer">Moisturizer</option>
            <option value="sunscreen">Sunscreen</option>
            <option value="treatment">Treatment</option>
          </select>
          <AccentBtn onClick={save} disabled={!t}>
            +
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
              <div key={it.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <div className="text-[13px]">{it.title}</div>
                  <div className="text-[11px] text-text-4 capitalize">
                    {p.step}
                  </div>
                </div>
                <GhostBtn onClick={() => userId && deleteItem(userId, it.id)}>
                  ×
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
      <div className="border-y border-border py-2.5">
        <div className="flex gap-2">
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Resolusi tahun ini"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          <AccentBtn onClick={save} disabled={!t}>
            +
          </AccentBtn>
        </div>
      </div>
      {thisYear.length > 0 && (
        <ListBox>
          {thisYear.map((it) => {
            const isDone = it.status === "done";
            return (
              <div key={it.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => toggle(it.id)}
                  className={`h-5 w-5 rounded border ${
                    isDone ? "border-accent bg-accent" : "border-border"
                  }`}
                />
                <div
                  className={`flex-1 text-[13px] ${
                    isDone ? "text-text-4 line-through" : ""
                  }`}
                >
                  {it.title}
                </div>
                <GhostBtn onClick={() => userId && deleteItem(userId, it.id)}>
                  ×
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
      <div className="border-y border-border py-2.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mimpi yang diingat…"
          rows={2}
          className="w-full resize-none bg-transparent text-[13px] outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setFeel(n)}
                className={`h-7 w-7 rounded text-[14px] ${
                  feel === n ? "bg-accent-soft" : ""
                }`}
              >
                {["😨", "😟", "😐", "🙂", "😊"][n - 1]}
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
          {entries.slice(0, 5).map((e) => (
            <div key={e.id} className="py-2.5">
              <div className="whitespace-pre-wrap text-[13px] text-text-1">
                {e.valueText}
              </div>
              <div className="mt-0.5 flex items-center justify-between">
                <div className="text-[11px] text-text-4">
                  {formatDateShort(e.date)} ·{" "}
                  {["😨", "😟", "😐", "🙂", "😊"][(e.valueNum ?? 3) - 1]}
                </div>
                <GhostBtn onClick={() => userId && deleteEntry(userId, e.id)}>
                  Hapus
                </GhostBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function DonationSection() {
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
      <div className="border-y border-border py-2.5">
        <div className="flex gap-2">
          <input
            value={cause}
            onChange={(e) => setCause(e.target.value)}
            placeholder="Untuk apa"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Rp"
            className="w-28 bg-transparent text-[13px] outline-none"
          />
          <AccentBtn onClick={add} disabled={!amount || !cause}>
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
                <div className="text-[11px] text-text-4">
                  {formatDateShort(e.date)}
                </div>
              </div>
              <span className="font-mono text-[13px] tabular-nums">
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
