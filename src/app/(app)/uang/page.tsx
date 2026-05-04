"use client";

import { useMemo, useState } from "react";
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
  addDeposit,
  addTransaction,
  deleteItem,
  upsertItem,
  useBudgets,
  useGoals,
  useItems,
  useTransactions,
} from "@/stores/data";
import { formatRupiah, formatDateShort, todayISO } from "@/lib/utils";

export default function UangPage() {
  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="Keuangan +"
        subtitle="Hutang, langganan, payday, closing bulanan"
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
        <DebtSection />
        <SubscriptionSection />
        <PaydaySection />
        <ClosingSection />
      </div>
    </div>
  );
}

/* ───── Hutang / Piutang ───── */
function DebtSection() {
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "debt") ?? [];
  const [t, setT] = useState("");
  const [who, setWho] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"owe" | "lent">("owe");

  async function save() {
    if (!userId || !who || !amount) return;
    await upsertItem(userId, {
      kind: "debt",
      title: t || (direction === "owe" ? `Hutang ke ${who}` : `Piutang ${who}`),
      who,
      amount: Number(amount),
      status: "open",
      date: todayISO(),
      payload: JSON.stringify({ direction }),
    });
    setT("");
    setWho("");
    setAmount("");
  }

  async function settle(id: string) {
    if (!userId) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    await upsertItem(userId, {
      ...it,
      status: it.status === "settled" ? "open" : "settled",
      due: it.status === "settled" ? undefined : todayISO(),
    });
  }

  // Aggregate by direction
  const open = items.filter((i) => i.status !== "settled");
  const totalOwe = open
    .filter((i) => JSON.parse(i.payload ?? "{}").direction === "owe")
    .reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalLent = open
    .filter((i) => JSON.parse(i.payload ?? "{}").direction === "lent")
    .reduce((s, i) => s + (i.amount ?? 0), 0);

  // Group by who (for "siapa hutang siapa")
  const byPerson = open.reduce<Record<string, { owe: number; lent: number }>>(
    (acc, it) => {
      const dir = JSON.parse(it.payload ?? "{}").direction as "owe" | "lent";
      acc[it.who ?? "—"] ??= { owe: 0, lent: 0 };
      acc[it.who ?? "—"][dir] += it.amount ?? 0;
      return acc;
    },
    {},
  );

  return (
    <Section
      title="Hutang & piutang"
      caption={`Hutang ${formatRupiah(totalOwe)} · Piutang ${formatRupiah(totalLent)}`}
      defaultOpen
    >
      <div className="border-y border-border py-2.5">
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setDirection("owe")}
              className={`flex-1 rounded-md border py-1 text-[12px] ${
                direction === "owe"
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text-3"
              }`}
            >
              Saya hutang
            </button>
            <button
              onClick={() => setDirection("lent")}
              className={`flex-1 rounded-md border py-1 text-[12px] ${
                direction === "lent"
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text-3"
              }`}
            >
              Saya pinjamin
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder={direction === "owe" ? "Hutang ke siapa" : "Pinjamin ke siapa"}
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Rp"
              className="w-28 bg-transparent text-[13px] outline-none"
            />
          </div>
          <div className="flex gap-2">
            <input
              value={t}
              onChange={(e) => setT(e.target.value)}
              placeholder="Catatan (opsional)"
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
            <AccentBtn onClick={save} disabled={!who || !amount}>
              +
            </AccentBtn>
          </div>
        </div>
      </div>

      {Object.keys(byPerson).length > 0 && (
        <div className="mt-2 border-y border-border py-2">
          <div className="mb-1 text-[11px] uppercase tracking-wider text-text-4">
            Per orang
          </div>
          {Object.entries(byPerson).map(([name, sums]) => {
            const net = sums.lent - sums.owe;
            return (
              <div
                key={name}
                className="flex items-center justify-between py-1 text-[12px]"
              >
                <span>{name}</span>
                <span
                  className={`font-mono tabular-nums ${
                    net > 0
                      ? "text-[color:var(--positive)]"
                      : net < 0
                        ? "text-[color:var(--negative)]"
                        : "text-text-3"
                  }`}
                >
                  {net === 0
                    ? "lunas"
                    : net > 0
                      ? `+${formatRupiah(net)}`
                      : formatRupiah(net)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <Empty>Catat hutang atau piutang.</Empty>
      ) : (
        <ListBox>
          {items.map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            const settled = it.status === "settled";
            return (
              <div key={it.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => settle(it.id)}
                  className={`h-5 w-5 rounded border ${
                    settled ? "border-accent bg-accent" : "border-border"
                  }`}
                />
                <div className="flex-1">
                  <div
                    className={`text-[13px] ${
                      settled ? "text-text-4 line-through" : ""
                    }`}
                  >
                    {p.direction === "owe" ? "→" : "←"} {it.who} · {it.title}
                  </div>
                  <div className="text-[11px] text-text-4">
                    {it.date && `dari ${formatDateShort(it.date)}`}
                    {settled && it.due && ` · lunas ${formatDateShort(it.due)}`}
                  </div>
                </div>
                <span className="font-mono text-[12px] tabular-nums">
                  {formatRupiah(it.amount ?? 0)}
                </span>
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

/* ───── Subscription manager ───── */
function SubscriptionSection() {
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "subscription") ?? [];
  const [t, setT] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [period, setPeriod] = useState("monthly");

  async function save() {
    if (!userId || !t || !amount) return;
    await upsertItem(userId, {
      kind: "subscription",
      title: t,
      amount: Number(amount),
      status: "active",
      payload: JSON.stringify({
        billDay: Number(day),
        period,
      }),
    });
    setT("");
    setAmount("");
    setDay("1");
  }

  async function pay(id: string) {
    if (!userId) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    // Log a transaction
    await addTransaction(userId, {
      kind: "out",
      amount: it.amount ?? 0,
      category: "Subscription",
      who: "",
      note: `Bayar ${it.title}`,
      date: todayISO(),
    });
    // Mark last paid
    await upsertItem(userId, {
      ...it,
      date: todayISO(),
    });
  }

  const monthly = items
    .filter((i) => i.status === "active")
    .reduce((s, i) => {
      const p = JSON.parse(i.payload ?? "{}");
      const factor = p.period === "yearly" ? 1 / 12 : p.period === "weekly" ? 4.33 : 1;
      return s + (i.amount ?? 0) * factor;
    }, 0);

  // Compute next bill day for each
  const today = new Date();
  const enriched = items.map((it) => {
    const p = JSON.parse(it.payload ?? "{}");
    const d = new Date(today.getFullYear(), today.getMonth(), p.billDay ?? 1);
    if (d.getTime() < today.getTime()) {
      d.setMonth(d.getMonth() + 1);
    }
    const days = Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
    return { it, p, days };
  });
  const sorted = enriched.sort((a, b) => a.days - b.days);

  return (
    <Section
      title="Langganan"
      caption={`${items.filter((i) => i.status === "active").length} aktif · ${formatRupiah(Math.round(monthly))}/bln`}
    >
      <div className="border-y border-border py-2.5">
        <div className="space-y-2">
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Netflix, Spotify, gym…"
            className="w-full bg-transparent text-[13px] outline-none"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Harga"
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-[13px] text-text-2 outline-none"
            >
              <option value="weekly">/minggu</option>
              <option value="monthly">/bulan</option>
              <option value="yearly">/tahun</option>
            </select>
            <input
              type="number"
              min="1"
              max="31"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              placeholder="Tgl"
              className="w-14 bg-transparent text-[13px] outline-none"
            />
            <AccentBtn onClick={save} disabled={!t || !amount}>
              +
            </AccentBtn>
          </div>
          <div className="text-[10px] text-text-4">
            Tgl = tanggal tagihan tiap periode
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <Empty>Catat semua langganan.</Empty>
      ) : (
        <ListBox>
          {sorted.map(({ it, p, days }) => (
            <div key={it.id} className="flex items-center gap-3 py-2.5">
              <div className="flex-1">
                <div className="text-[13px]">{it.title}</div>
                <div className="text-[11px] text-text-4">
                  {formatRupiah(it.amount ?? 0)}
                  {p.period === "yearly"
                    ? "/thn"
                    : p.period === "weekly"
                      ? "/mgg"
                      : "/bln"}
                  {` · tagih tgl ${p.billDay}`}
                  {it.date && ` · terakhir bayar ${formatDateShort(it.date)}`}
                </div>
              </div>
              {days <= 3 && (
                <span className="text-[10px] uppercase tracking-wider text-[color:var(--warning)]">
                  H-{days}
                </span>
              )}
              <button
                onClick={() => pay(it.id)}
                className="rounded-md border border-border px-2 py-0.5 text-[11px] text-text-3"
              >
                Bayar
              </button>
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

/* ───── Pay day mode ───── */
function PaydaySection() {
  const userId = useAuth((s) => s.userId);
  const goals = useGoals(userId) ?? [];
  const [salary, setSalary] = useState("");
  const [savePct, setSavePct] = useState("20");
  const [needPct, setNeedPct] = useState("50");
  const [wantPct, setWantPct] = useState("30");
  const [splitGoalId, setSplitGoalId] = useState<string>("");
  const [done, setDone] = useState<string | null>(null);

  const salaryN = Number(salary) || 0;
  const save_ = Math.round((salaryN * Number(savePct)) / 100);
  const need = Math.round((salaryN * Number(needPct)) / 100);
  const want = Math.round((salaryN * Number(wantPct)) / 100);
  const total = Number(savePct) + Number(needPct) + Number(wantPct);

  async function execute() {
    if (!userId || !salaryN) return;
    // 1. Income transaction
    await addTransaction(userId, {
      kind: "in",
      amount: salaryN,
      category: "Gaji",
      who: "",
      note: "Pay day",
      date: todayISO(),
    });
    // 2. Auto-deposit to selected goal
    if (splitGoalId && save_ > 0) {
      await addDeposit(userId, {
        goalId: splitGoalId,
        amount: save_,
        who: "",
        note: "Auto pay day",
        date: todayISO(),
      });
    }
    setDone(
      splitGoalId && save_ > 0
        ? `Gaji ${formatRupiah(salaryN)} diinput. Tabungan ${formatRupiah(save_)} masuk goal.`
        : `Gaji ${formatRupiah(salaryN)} diinput. Pilih goal supaya tabungan otomatis tertabung.`,
    );
    setSalary("");
    setTimeout(() => setDone(null), 4000);
  }

  return (
    <Section
      title="Pay day mode"
      caption="Auto-distribusi gaji ke goal & budget"
    >
      <div className="space-y-2 border-y border-border py-2.5">
        <div className="flex gap-2">
          <input
            type="number"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="Gaji bulan ini"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
        </div>

        <div className="text-[11px] uppercase tracking-wider text-text-4">
          Aturan distribusi (%)
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-[10px] text-text-4">Kebutuhan</div>
            <input
              type="number"
              value={needPct}
              onChange={(e) => setNeedPct(e.target.value)}
              className="w-full bg-transparent text-[13px] outline-none"
            />
          </div>
          <div>
            <div className="text-[10px] text-text-4">Tabungan</div>
            <input
              type="number"
              value={savePct}
              onChange={(e) => setSavePct(e.target.value)}
              className="w-full bg-transparent text-[13px] outline-none"
            />
          </div>
          <div>
            <div className="text-[10px] text-text-4">Bebas</div>
            <input
              type="number"
              value={wantPct}
              onChange={(e) => setWantPct(e.target.value)}
              className="w-full bg-transparent text-[13px] outline-none"
            />
          </div>
        </div>
        {total !== 100 && (
          <div className="text-[10px] text-[color:var(--warning)]">
            Total {total}% — sebaiknya 100%
          </div>
        )}

        <div>
          <div className="text-[10px] text-text-4">Tabungan masuk ke goal</div>
          <select
            value={splitGoalId}
            onChange={(e) => setSplitGoalId(e.target.value)}
            className="w-full bg-transparent text-[13px] text-text-2 outline-none"
          >
            <option value="">— pilih goal —</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {salaryN > 0 && (
          <div className="rounded-md border border-border p-2">
            <div className="text-[11px] uppercase tracking-wider text-text-4">
              Preview
            </div>
            <div className="mt-1 space-y-0.5 text-[12px]">
              <Row label="Kebutuhan" v={need} />
              <Row label="Tabungan" v={save_} />
              <Row label="Bebas" v={want} />
            </div>
          </div>
        )}

        <AccentBtn onClick={execute} disabled={!salaryN}>
          Distribusi sekarang
        </AccentBtn>

        {done && (
          <div className="rounded-md bg-positive-bg px-3 py-1.5 text-[11px] text-[color:var(--positive)]">
            {done}
          </div>
        )}
      </div>
    </Section>
  );
}

function Row({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-3">{label}</span>
      <span className="font-mono tabular-nums">{formatRupiah(v)}</span>
    </div>
  );
}

/* ───── Monthly closing ritual ───── */
function ClosingSection() {
  const userId = useAuth((s) => s.userId);
  const txs = useTransactions(userId) ?? [];
  const goals = useGoals(userId) ?? [];
  const budgets = useBudgets(userId) ?? [];
  const [transferGoalId, setTransferGoalId] = useState<string>("");
  const [reflection, setReflection] = useState("");
  const [done, setDone] = useState<string | null>(null);

  // Compute current month stats
  const stats = useMemo(() => {
    const now_ = new Date();
    const month = now_.toISOString().slice(0, 7);
    const monthTx = txs.filter((t) => t.date.startsWith(month));
    const income = monthTx
      .filter((t) => t.kind === "in")
      .reduce((s, t) => s + t.amount, 0);
    const expense = monthTx
      .filter((t) => t.kind === "out")
      .reduce((s, t) => s + t.amount, 0);
    const surplus = income - expense;

    // Top categories
    const byCat: Record<string, number> = {};
    monthTx
      .filter((t) => t.kind === "out")
      .forEach((t) => {
        byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
      });
    const topCat = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Budgets summary
    const overBudgets = budgets
      .map((b) => {
        const spent = monthTx
          .filter((t) => t.kind === "out" && t.category === b.category)
          .reduce((s, t) => s + t.amount, 0);
        return { ...b, spent };
      })
      .filter((b) => b.spent > b.limit);

    return { income, expense, surplus, topCat, overBudgets, monthTx };
  }, [txs, budgets]);

  async function close() {
    if (!userId) return;
    if (stats.surplus > 0 && transferGoalId) {
      await addDeposit(userId, {
        goalId: transferGoalId,
        amount: stats.surplus,
        who: "",
        note: "Surplus akhir bulan",
        date: todayISO(),
      });
    }
    if (reflection.trim()) {
      await addTransaction(userId, {
        kind: "in",
        amount: 0,
        category: "Reflection",
        who: "",
        note: `[Closing] ${reflection.trim()}`,
        date: todayISO(),
      });
    }
    setDone(
      stats.surplus > 0 && transferGoalId
        ? `Surplus ${formatRupiah(stats.surplus)} sudah ditabung.`
        : "Closing tersimpan.",
    );
    setReflection("");
    setTransferGoalId("");
    setTimeout(() => setDone(null), 4000);
  }

  const monthName = new Date().toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <Section
      title="Closing bulanan"
      caption={`Ringkasan ${monthName}`}
    >
      <div className="space-y-2 border-y border-border py-2.5">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Masuk" v={stats.income} pos />
          <Stat label="Keluar" v={stats.expense} neg />
          <Stat label="Surplus" v={stats.surplus} pos={stats.surplus >= 0} neg={stats.surplus < 0} />
        </div>

        {stats.topCat.length > 0 && (
          <div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-text-4">
              Top 3 kategori
            </div>
            {stats.topCat.map(([cat, v]) => (
              <div key={cat} className="flex justify-between text-[12px]">
                <span className="text-text-3">{cat}</span>
                <span className="font-mono tabular-nums">{formatRupiah(v)}</span>
              </div>
            ))}
          </div>
        )}

        {stats.overBudgets.length > 0 && (
          <div className="rounded-md border border-[color:var(--warning)] p-2">
            <div className="text-[11px] text-[color:var(--warning)]">
              Budget over: {stats.overBudgets.map((b) => b.category).join(", ")}
            </div>
          </div>
        )}

        {stats.surplus > 0 && (
          <div>
            <div className="text-[10px] text-text-4">
              Transfer surplus ke goal
            </div>
            <select
              value={transferGoalId}
              onChange={(e) => setTransferGoalId(e.target.value)}
              className="w-full bg-transparent text-[13px] text-text-2 outline-none"
            >
              <option value="">— pilih goal —</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Catatan refleksi bulan ini…"
          rows={2}
          className="w-full resize-none bg-transparent text-[13px] outline-none"
        />

        <AccentBtn onClick={close} disabled={stats.monthTx.length === 0}>
          Closing bulan ini
        </AccentBtn>

        {done && (
          <div className="rounded-md bg-positive-bg px-3 py-1.5 text-[11px] text-[color:var(--positive)]">
            {done}
          </div>
        )}
      </div>
    </Section>
  );
}

function Stat({
  label,
  v,
  pos,
  neg,
}: {
  label: string;
  v: number;
  pos?: boolean;
  neg?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-4">
        {label}
      </div>
      <div
        className={`font-mono text-[13px] tabular-nums ${
          pos ? "text-[color:var(--positive)]" : neg ? "text-[color:var(--negative)]" : ""
        }`}
      >
        {formatRupiah(v)}
      </div>
    </div>
  );
}
