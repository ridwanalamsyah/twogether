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
  deleteItem,
  upsertItem,
  useItems,
} from "@/stores/data";
import { todayISO, formatDateShort, formatRupiah } from "@/lib/utils";
import { daysBetween } from "@/lib/dates";

export default function RumahPage() {
  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="Rumah"
      />

      <div className="px-5">
        <SectionTabs storageKey="rumah">
        <ShoppingSection />
        <PantrySection />
        <CleaningSection />
        <MealPlanSection />
        <MaintenanceSection />
        <PetSection />
        </SectionTabs>
      </div>
    </div>
  );
}

/* ───── Shopping list ───── */
function ShoppingSection() {
  const uid = useId();
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
      <div className="form-card">
        <div className="space-y-2">
          <label htmlFor={`${uid}-item`} className="sr-only">
            Nama barang belanja
          </label>
          <input
            id={`${uid}-item`}
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Beras, sabun, dll"
            className="w-full bg-transparent text-[13px]"
          />
          <div className="flex gap-2">
            <label htmlFor={`${uid}-where`} className="sr-only">
              Lokasi beli
            </label>
            <input
              id={`${uid}-where`}
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="Beli di"
              className="flex-1 bg-transparent text-[13px]"
            />
            <label htmlFor={`${uid}-price`} className="sr-only">
              Perkiraan harga
            </label>
            <input
              id={`${uid}-price`}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Harga"
              className="w-24 bg-transparent text-[13px]"
            />
            <AccentBtn onClick={save} disabled={!t} aria-label="Tambah item belanja">
              Tambah
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
              <div key={it.id} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  aria-pressed={isDone}
                  aria-label={`${isDone ? "Buka lagi" : "Tandai sudah dibeli"} ${it.title}`}
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
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[13px] ${
                      isDone ? "text-text-3 line-through" : ""
                    }`}
                  >
                    {it.title}
                  </div>
                  <div className="text-[12px] text-text-3">
                    {[p.where, p.price ? formatRupiah(p.price) : null]
                      .filter(Boolean)
                      .join(" · ") || "Belum ada detail"}
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

/* ───── Pantry / stok dapur ───── */
function PantrySection() {
  const uid = useId();
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
      <div className="form-card">
        <div className="space-y-2">
          <label htmlFor={`${uid}-name`} className="sr-only">
            Nama bahan dapur
          </label>
          <input
            id={`${uid}-name`}
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Nama (telur, susu...)"
            className="w-full bg-transparent text-[13px]"
          />
          <div className="flex gap-2">
            <label htmlFor={`${uid}-qty`} className="sr-only">
              Jumlah stok
            </label>
            <input
              id={`${uid}-qty`}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Jumlah"
              className="flex-1 bg-transparent text-[13px]"
            />
            <label htmlFor={`${uid}-exp`} className="sr-only">
              Tanggal kadaluarsa
            </label>
            <input
              id={`${uid}-exp`}
              type="date"
              value={exp}
              onChange={(e) => setExp(e.target.value)}
              className="min-h-[44px] bg-transparent text-[13px]"
            />
            <AccentBtn onClick={save} disabled={!t} aria-label="Tambah stok dapur">
              Tambah
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
              ? daysBetween(todayISO(), it.due.slice(0, 10))
              : null;
            return (
              <div key={it.id} className="flex items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px]">{it.title}</div>
                  <div className="text-[12px] text-text-3">
                    {p.qty ? `${p.qty} · ` : ""}
                    {it.due ? `kadaluarsa ${formatDateShort(it.due)}` : "Tanpa tanggal kadaluarsa"}
                  </div>
                </div>
                {daysToExp != null && daysToExp <= 3 && (
                  <span className="text-[12px] section-label text-[color:var(--negative)]">
                    {daysToExp <= 0 ? "expired" : `H-${daysToExp}`}
                  </span>
                )}
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

/* ───── Cleaning ───── */
function CleaningSection() {
  const uid = useId();
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
      <div className="form-card">
        <div className="space-y-2">
          <label htmlFor={`${uid}-task`} className="sr-only">
            Tugas kebersihan
          </label>
          <input
            id={`${uid}-task`}
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Vacuum, lap kaca, ganti sprei..."
            className="w-full bg-transparent text-[13px]"
          />
          <div className="flex gap-2">
            <label htmlFor={`${uid}-who`} className="sr-only">
              Giliran anggota
            </label>
            <input
              id={`${uid}-who`}
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="Giliran"
              className="flex-1 bg-transparent text-[13px]"
            />
            <label htmlFor={`${uid}-interval`} className="sr-only">
              Interval jadwal
            </label>
            <select
              id={`${uid}-interval`}
              value={interval_}
              onChange={(e) => setInterval(e.target.value)}
              className="min-h-[44px] bg-transparent text-[13px] text-text-2"
            >
              <option value="1">tiap hari</option>
              <option value="3">3 hari</option>
              <option value="7">tiap minggu</option>
              <option value="14">2 minggu</option>
              <option value="30">bulanan</option>
            </select>
            <AccentBtn onClick={save} disabled={!t} aria-label="Tambah task kebersihan">
              Tambah
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
              <div key={it.id} className="flex items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px]">{it.title}</div>
                  <div className="text-[12px] text-text-3">
                    {it.who ? `${it.who} · ` : ""}
                    tiap {p.interval} hari
                    {last ? ` · terakhir ${formatDateShort(last)}` : ""}
                  </div>
                </div>
                {overdue && (
                  <span className="text-[12px] section-label text-[color:var(--negative)]">
                    Telat
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => done(it.id)}
                  className="min-h-[44px] rounded-md border border-border px-3 py-1 text-[12px] font-medium text-text-2 hover:bg-bg-elev1"
                >
                  Selesai
                </button>
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

/* ───── Meal plan ───── */
function MealPlanSection() {
  const uid = useId();
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
    const d = it.date ?? "-";
    (acc[d] ??= []).push(it);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort().slice(-7);

  return (
    <Section title="Meal plan" caption="7 hari ke depan">
      <div className="form-card">
        <div className="flex flex-wrap gap-2">
          <label htmlFor={`${uid}-date`} className="sr-only">
            Tanggal makan
          </label>
          <input
            id={`${uid}-date`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-[44px] bg-transparent text-[13px]"
          />
          <label htmlFor={`${uid}-slot`} className="sr-only">
            Waktu makan
          </label>
          <select
            id={`${uid}-slot`}
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            className="min-h-[44px] bg-transparent text-[13px] text-text-2"
          >
            <option value="pagi">Pagi</option>
            <option value="siang">Siang</option>
            <option value="malam">Malam</option>
          </select>
          <label htmlFor={`${uid}-meal`} className="sr-only">
            Menu makanan
          </label>
          <input
            id={`${uid}-meal`}
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
            placeholder="Menu"
            className="min-w-[120px] flex-1 bg-transparent text-[13px]"
          />
          <AccentBtn onClick={save} disabled={!meal} aria-label="Tambah menu makan">
            Tambah
          </AccentBtn>
        </div>
      </div>
      {dates.length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {dates.map((d) => (
            <div key={d} className="py-2.5">
              <div className="text-[12px] font-medium section-label text-text-4">
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
                      <GhostBtn aria-label={`Hapus ${m.title}`} onClick={() => userId && deleteItem(userId, m.id)}>
                        <X size={16} aria-hidden="true" />
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
  const uid = useId();
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
      caption="Service AC, ganti filter, kendaraan"
    >
      <div className="form-card">
        <div className="flex gap-2">
          <label htmlFor={`${uid}-title`} className="sr-only">
            Item perawatan
          </label>
          <input
            id={`${uid}-title`}
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Service AC, dll"
            className="flex-1 bg-transparent text-[13px]"
          />
          <label htmlFor={`${uid}-due`} className="sr-only">
            Jadwal perawatan
          </label>
          <input
            id={`${uid}-due`}
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="min-h-[44px] bg-transparent text-[13px]"
          />
          <AccentBtn onClick={save} disabled={!t} aria-label="Tambah perawatan rumah">
            Tambah
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
                ? daysBetween(todayISO(), it.due.slice(0, 10))
                : null;
              return (
                <div key={it.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px]">{it.title}</div>
                    <div className="text-[12px] text-text-3">
                      {it.due ? `Jatuh tempo ${formatDateShort(it.due)}` : "Belum ada jadwal"}
                    </div>
                  </div>
                  {days != null && days <= 7 && (
                    <span className="text-[12px] section-label text-[color:var(--negative)]">
                      {days <= 0 ? "telat" : `H-${days}`}
                    </span>
                  )}
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

/* ───── Pet tracker ───── */
function PetSection() {
  const uid = useId();
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
      <div className="form-card">
        <div className="space-y-2">
          <label htmlFor={`${uid}-name`} className="sr-only">
            Nama hewan peliharaan
          </label>
          <input
            id={`${uid}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama pet"
            className="w-full bg-transparent text-[13px]"
          />
          <div className="flex gap-2">
            <label htmlFor={`${uid}-type`} className="sr-only">
              Jenis hewan peliharaan
            </label>
            <input
              id={`${uid}-type`}
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Kucing, anjing..."
              className="flex-1 bg-transparent text-[13px]"
            />
            <label htmlFor={`${uid}-vax`} className="sr-only">
              Jadwal vaksin berikutnya
            </label>
            <input
              id={`${uid}-vax`}
              type="date"
              value={vaccineDue}
              onChange={(e) => setVaccineDue(e.target.value)}
              className="min-h-[44px] bg-transparent text-[13px]"
            />
            <AccentBtn onClick={save} disabled={!name} aria-label="Tambah hewan peliharaan">
              Tambah
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
              <div key={it.id} className="flex items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px]">{it.title}</div>
                  <div className="text-[12px] text-text-3">
                    {[p.type, it.due && `vaksin ${formatDateShort(it.due)}`]
                      .filter(Boolean)
                      .join(" · ") || "Detail belum diisi"}
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
