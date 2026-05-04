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
  deleteItem,
  upsertItem,
  useItems,
} from "@/stores/data";
import { todayISO, formatDateShort, formatRupiah } from "@/lib/utils";

export default function RumahPage() {
  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="Rumah"
        subtitle="Belanja, stok, kebersihan, meal plan, maintenance, pet"
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
        <ShoppingSection />
        <PantrySection />
        <CleaningSection />
        <MealPlanSection />
        <MaintenanceSection />
        <PetSection />
      </div>
    </div>
  );
}

/* ───── Shopping list ───── */
function ShoppingSection() {
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "shopping") ?? [];
  const [t, setT] = useState("");
  const [where, setWhere] = useState("");
  const [price, setPrice] = useState("");

  async function save() {
    if (!userId || !t) return;
    await upsertItem(userId, {
      kind: "shopping",
      title: t,
      status: "todo",
      payload: JSON.stringify({ where, price: price ? Number(price) : 0 }),
    });
    setT("");
    setWhere("");
    setPrice("");
  }

  async function toggle(id: string) {
    if (!userId) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    await upsertItem(userId, {
      ...it,
      status: it.status === "done" ? "todo" : "done",
      date: it.status === "done" ? undefined : todayISO(),
    });
  }

  return (
    <Section
      title="Belanja"
      caption={`${items.filter((i) => i.status !== "done").length} item perlu dibeli`}
      defaultOpen
    >
      <div className="border-y border-border py-2.5">
        <div className="space-y-2">
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Beras, sabun, dll"
            className="w-full bg-transparent text-[13px] outline-none"
          />
          <div className="flex gap-2">
            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="Beli di"
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Harga"
              className="w-24 bg-transparent text-[13px] outline-none"
            />
            <AccentBtn onClick={save} disabled={!t}>
              +
            </AccentBtn>
          </div>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty>List belanjaan rumah.</Empty>
      ) : (
        <ListBox>
          {items.map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            const isDone = it.status === "done";
            return (
              <div key={it.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => toggle(it.id)}
                  className={`h-5 w-5 rounded border ${
                    isDone ? "border-accent bg-accent" : "border-border"
                  }`}
                />
                <div className="flex-1">
                  <div
                    className={`text-[13px] ${
                      isDone ? "text-text-4 line-through" : ""
                    }`}
                  >
                    {it.title}
                  </div>
                  <div className="text-[11px] text-text-4">
                    {[p.where, p.price ? formatRupiah(p.price) : null]
                      .filter(Boolean)
                      .join(" · ") || "—"}
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

/* ───── Pantry / stok dapur ───── */
function PantrySection() {
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "pantry") ?? [];
  const [t, setT] = useState("");
  const [exp, setExp] = useState("");
  const [qty, setQty] = useState("");

  async function save() {
    if (!userId || !t) return;
    await upsertItem(userId, {
      kind: "pantry",
      title: t,
      status: "in",
      due: exp || undefined,
      payload: JSON.stringify({ qty }),
    });
    setT("");
    setExp("");
    setQty("");
  }

  // Sort by exp asc (urgent first)
  const sorted = [...items].sort((a, b) => (a.due ?? "z").localeCompare(b.due ?? "z"));

  return (
    <Section
      title="Stok dapur"
      caption={`${items.length} item`}
    >
      <div className="border-y border-border py-2.5">
        <div className="space-y-2">
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Nama (telur, susu…)"
            className="w-full bg-transparent text-[13px] outline-none"
          />
          <div className="flex gap-2">
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Jumlah"
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
            <input
              type="date"
              value={exp}
              onChange={(e) => setExp(e.target.value)}
              className="bg-transparent text-[13px] outline-none"
            />
            <AccentBtn onClick={save} disabled={!t}>
              +
            </AccentBtn>
          </div>
        </div>
      </div>
      {sorted.length === 0 ? (
        <Empty>Catat stok yang ada.</Empty>
      ) : (
        <ListBox>
          {sorted.map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            const daysToExp = it.due
              ? Math.ceil((new Date(it.due).getTime() - Date.now()) / 86_400_000)
              : null;
            return (
              <div key={it.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <div className="text-[13px]">{it.title}</div>
                  <div className="text-[11px] text-text-4">
                    {p.qty ? `${p.qty} · ` : ""}
                    {it.due ? `kadaluarsa ${formatDateShort(it.due)}` : "—"}
                  </div>
                </div>
                {daysToExp != null && daysToExp <= 3 && (
                  <span className="text-[10px] uppercase tracking-wider text-[color:var(--negative)]">
                    {daysToExp <= 0 ? "expired" : `H-${daysToExp}`}
                  </span>
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

/* ───── Cleaning ───── */
function CleaningSection() {
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "cleaning") ?? [];
  const [t, setT] = useState("");
  const [interval_, setInterval] = useState("7");
  const [who, setWho] = useState("");

  async function save() {
    if (!userId || !t) return;
    await upsertItem(userId, {
      kind: "cleaning",
      title: t,
      status: "todo",
      who,
      payload: JSON.stringify({ interval: Number(interval_) }),
    });
    setT("");
    setWho("");
  }

  async function done(id: string) {
    if (!userId) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    await upsertItem(userId, {
      ...it,
      date: todayISO(),
    });
  }

  return (
    <Section
      title="Kebersihan"
      caption={`${items.length} task rutin`}
    >
      <div className="border-y border-border py-2.5">
        <div className="space-y-2">
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Vacuum, lap kaca, ganti sprei…"
            className="w-full bg-transparent text-[13px] outline-none"
          />
          <div className="flex gap-2">
            <input
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="Giliran"
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
            <select
              value={interval_}
              onChange={(e) => setInterval(e.target.value)}
              className="bg-transparent text-[13px] text-text-2 outline-none"
            >
              <option value="1">tiap hari</option>
              <option value="3">3 hari</option>
              <option value="7">tiap minggu</option>
              <option value="14">2 minggu</option>
              <option value="30">bulanan</option>
            </select>
            <AccentBtn onClick={save} disabled={!t}>
              +
            </AccentBtn>
          </div>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty>Buat checklist kebersihan rutin.</Empty>
      ) : (
        <ListBox>
          {items.map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            const last = it.date;
            const daysSince = last
              ? Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000)
              : null;
            const overdue = daysSince != null && daysSince >= (p.interval ?? 7);
            return (
              <div key={it.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <div className="text-[13px]">{it.title}</div>
                  <div className="text-[11px] text-text-4">
                    {it.who ? `${it.who} · ` : ""}
                    tiap {p.interval} hari
                    {last ? ` · terakhir ${formatDateShort(last)}` : ""}
                  </div>
                </div>
                {overdue && (
                  <span className="text-[10px] uppercase tracking-wider text-[color:var(--negative)]">
                    Telat
                  </span>
                )}
                <button
                  onClick={() => done(it.id)}
                  className="rounded-md border border-border px-2 py-0.5 text-[11px] text-text-3"
                >
                  Selesai
                </button>
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

/* ───── Meal plan ───── */
function MealPlanSection() {
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "meal") ?? [];
  const [date, setDate] = useState(todayISO());
  const [meal, setMeal] = useState("");
  const [slot, setSlot] = useState("siang");

  async function save() {
    if (!userId || !meal) return;
    await upsertItem(userId, {
      kind: "meal",
      title: meal,
      date,
      payload: JSON.stringify({ slot }),
    });
    setMeal("");
  }

  // Group by date
  const byDate = items.reduce<Record<string, typeof items>>((acc, it) => {
    const d = it.date ?? "—";
    (acc[d] ??= []).push(it);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort().slice(-7);

  return (
    <Section title="Meal plan" caption="7 hari ke depan">
      <div className="border-y border-border py-2.5">
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-[13px] outline-none"
          />
          <select
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            className="bg-transparent text-[13px] text-text-2 outline-none"
          >
            <option value="pagi">Pagi</option>
            <option value="siang">Siang</option>
            <option value="malam">Malam</option>
          </select>
          <input
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
            placeholder="Menu"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          <AccentBtn onClick={save} disabled={!meal}>
            +
          </AccentBtn>
        </div>
      </div>
      {dates.length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {dates.map((d) => (
            <div key={d} className="py-2.5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-text-4">
                {formatDateShort(d)}
              </div>
              <div className="mt-1 space-y-1">
                {byDate[d].map((m) => {
                  const p = JSON.parse(m.payload ?? "{}");
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-[12px]"
                    >
                      <span className="text-text-2 capitalize">
                        {p.slot}
                      </span>
                      <span className="flex-1 px-2 text-text-1">
                        {m.title}
                      </span>
                      <GhostBtn onClick={() => userId && deleteItem(userId, m.id)}>
                        ×
                      </GhostBtn>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ───── Maintenance ───── */
function MaintenanceSection() {
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "maintenance") ?? [];
  const [t, setT] = useState("");
  const [due, setDue] = useState("");

  async function save() {
    if (!userId || !t) return;
    await upsertItem(userId, {
      kind: "maintenance",
      title: t,
      due: due || undefined,
    });
    setT("");
    setDue("");
  }

  return (
    <Section
      title="Maintenance"
      caption="Service AC, ganti filter, kendaraan…"
    >
      <div className="border-y border-border py-2.5">
        <div className="flex gap-2">
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Service AC, dll"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="bg-transparent text-[13px] outline-none"
          />
          <AccentBtn onClick={save} disabled={!t}>
            +
          </AccentBtn>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty>Belum ada.</Empty>
      ) : (
        <ListBox>
          {items
            .sort((a, b) => (a.due ?? "z").localeCompare(b.due ?? "z"))
            .map((it) => {
              const days = it.due
                ? Math.ceil((new Date(it.due).getTime() - Date.now()) / 86_400_000)
                : null;
              return (
                <div key={it.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1">
                    <div className="text-[13px]">{it.title}</div>
                    <div className="text-[11px] text-text-4">
                      {it.due ? `Jatuh tempo ${formatDateShort(it.due)}` : "—"}
                    </div>
                  </div>
                  {days != null && days <= 7 && (
                    <span className="text-[10px] uppercase tracking-wider text-[color:var(--negative)]">
                      {days <= 0 ? "telat" : `H-${days}`}
                    </span>
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

/* ───── Pet tracker ───── */
function PetSection() {
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "pet") ?? [];
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [vaccineDue, setVaccineDue] = useState("");

  async function save() {
    if (!userId || !name) return;
    await upsertItem(userId, {
      kind: "pet",
      title: name,
      due: vaccineDue || undefined,
      payload: JSON.stringify({ type }),
    });
    setName("");
    setType("");
    setVaccineDue("");
  }

  return (
    <Section title="Pet" caption={`${items.length} pet`}>
      <div className="border-y border-border py-2.5">
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama pet"
            className="w-full bg-transparent text-[13px] outline-none"
          />
          <div className="flex gap-2">
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Kucing, anjing…"
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
            <input
              type="date"
              value={vaccineDue}
              onChange={(e) => setVaccineDue(e.target.value)}
              placeholder="Vaksin"
              className="bg-transparent text-[13px] outline-none"
            />
            <AccentBtn onClick={save} disabled={!name}>
              +
            </AccentBtn>
          </div>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty>Catat pet kalau ada.</Empty>
      ) : (
        <ListBox>
          {items.map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            return (
              <div key={it.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <div className="text-[13px]">{it.title}</div>
                  <div className="text-[11px] text-text-4">
                    {[p.type, it.due && `vaksin ${formatDateShort(it.due)}`]
                      .filter(Boolean)
                      .join(" · ") || "—"}
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
