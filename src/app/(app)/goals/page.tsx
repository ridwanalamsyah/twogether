"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import {
  addDeposit,
  deleteGoal,
  deleteRecurringGoal,
  upsertGoal,
  upsertRecurringGoal,
  useDeposits,
  useGoals,
  useRecurringGoals,
} from "@/stores/data";
import { predictGoal } from "@/services/prediction";
import {
  clamp,
  formatRupiah,
  formatRupiahShort,
  todayISO,
} from "@/lib/utils";
import type { DepositRecord, GoalRecord } from "@/lib/db";
import { GoalSimulator } from "@/components/goals/GoalSimulator";
import { EmptyState } from "@/components/ui/EmptyState";

const CATEGORY_OPTIONS: { id: GoalRecord["category"]; label: string; emoji: string }[] =
  [
    { id: "savings", label: "Tabungan", emoji: "💰" },
    { id: "modal", label: "Modal Usaha", emoji: "🏪" },
    { id: "travel", label: "Traveling", emoji: "✈️" },
    { id: "custom", label: "Lain", emoji: "🎯" },
  ];

export default function GoalsPage() {
  const params = useSearchParams();
  const userId = useAuth((s) => s.userId);
  const goals = useGoals(userId);
  const deposits = useDeposits(userId);
  const [focusId, setFocusId] = useState<string | null>(params.get("focus"));
  const [showAdd, setShowAdd] = useState(false);
  const [showDeposit, setShowDeposit] = useState<GoalRecord | null>(null);
  const [editing, setEditing] = useState<GoalRecord | null>(null);

  const focus = useMemo(
    () => (goals ?? []).find((g) => g.id === focusId) ?? (goals ?? [])[0],
    [goals, focusId],
  );
  const focusPrediction = useMemo(
    () => (focus ? predictGoal(focus, deposits ?? []) : null),
    [focus, deposits],
  );

  return (
    <div className="animate-in">
      <AppHeader
        title="Goals"
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg"
          >
            Goal
          </button>
        }
      />

      <div className="space-y-3 px-5 pt-4 pb-6">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {(goals ?? []).map((g) => (
            <button
              key={g.id}
              onClick={() => setFocusId(g.id)}
              className={`flex-shrink-0 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                focus?.id === g.id
                  ? "border-text-1 bg-text-1 text-bg-app"
                  : "border-border bg-bg-app text-text-2"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {focus && focusPrediction && (
          <>
            <GoalCard
              goal={focus}
              saved={focusPrediction.saved}
              deposits={deposits ?? []}
              onAddDeposit={() => setShowDeposit(focus)}
              onEdit={() => setEditing(focus)}
              onDelete={async () => {
                if (!userId) return;
                if (!confirm("Hapus goal ini?")) return;
                await deleteGoal(userId, focus.id);
                setFocusId(null);
              }}
            />
            <PredictionPanel goal={focus} />
            <GoalSimulator goal={focus} deposits={deposits ?? []} />
            <RecurringGoalsPanel goal={focus} />
          </>
        )}

        {(goals ?? []).length === 0 && (
          <EmptyState
            emoji="🎯"
            title="Belum ada goal"
            body="Tambahkan target — laptop baru, dana nikah, traveling — dan kami bantu hitung kapan tercapainya."
            cta="Bikin goal pertama"
            onCta={() => setShowAdd(true)}
          />
        )}
      </div>

      {showAdd && <GoalSheet onClose={() => setShowAdd(false)} />}
      {editing && (
        <GoalSheet goal={editing} onClose={() => setEditing(null)} />
      )}
      {showDeposit && (
        <DepositSheet
          goal={showDeposit}
          onClose={() => setShowDeposit(null)}
        />
      )}
    </div>
  );
}

function GoalCard({
  goal,
  saved,
  deposits,
  onAddDeposit,
  onEdit,
  onDelete,
}: {
  goal: GoalRecord;
  saved: number;
  deposits: DepositRecord[];
  onAddDeposit: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = clamp((saved / goal.target) * 100, 0, 100);
  const goalDeposits = useMemo(
    () => deposits.filter((d) => d.goalId === goal.id),
    [deposits, goal.id],
  );
  const byMember = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of goalDeposits) m.set(d.who, (m.get(d.who) ?? 0) + d.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [goalDeposits]);
  return (
    <div className="surface p-5 theme-transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-semibold tracking-tight">
            {goal.name}
          </div>
          <div className="mt-1 font-mono text-[12px] text-text-3">
            {formatRupiah(saved)} <span className="text-text-4">/ {formatRupiah(goal.target)}</span>
            {goal.deadline && (
              <span className="ml-1.5 text-text-4">· {goal.deadline}</span>
            )}
          </div>
        </div>
        <div className="flex gap-3 text-[11px]">
          <button onClick={onEdit} className="text-text-3 hover:text-text-1">
            Edit
          </button>
          <button onClick={onDelete} className="text-text-4 hover:text-[color:var(--negative)]">
            Hapus
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-bg-elev2">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-[11px] tabular-nums text-text-3">{Math.round(pct)}%</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium tabular-nums">
          {(goal.milestones ?? [25, 50, 75, 100]).map((m, i, arr) => {
            const reached = pct >= m;
            return (
              <span key={m} className="flex items-center gap-1.5">
                <span className={reached ? "text-text-1" : "text-text-5"}>
                  {m}%
                </span>
                {i < arr.length - 1 && <span className="text-text-5">·</span>}
              </span>
            );
          })}
        </div>
        <button
          onClick={onAddDeposit}
          className="rounded-md bg-text-1 px-2.5 py-1 text-[11px] font-medium text-bg-app"
        >
          Setor
        </button>
      </div>
      {byMember.length >= 2 && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-4">
            Kontribusi
          </div>
          <div className="space-y-1">
            {byMember.map(([name, amount]) => {
              const share = (amount / saved) * 100;
              return (
                <div key={name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{name}</span>
                    <span className="font-mono text-text-2">
                      {formatRupiah(amount)} · {Math.round(share)}%
                    </span>
                  </div>
                  <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-bg-elev3">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RecurringGoalsPanel({ goal }: { goal: GoalRecord }) {
  const userId = useAuth((s) => s.userId);
  const all = useRecurringGoals(userId) ?? [];
  const recurring = all.filter((r) => r.goalId === goal.id);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-text-3">
          Auto-deposit
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs font-semibold text-accent hover:underline"
        >
          + Tambah
        </button>
      </div>
      {recurring.length === 0 ? (
        <p className="text-xs text-text-3">
          Belum ada auto-deposit. Cocok kalau mau tabung jumlah sama tiap bulan tanpa lupa.
        </p>
      ) : (
        <div className="space-y-1.5">
          {recurring.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md bg-bg-elev2 px-3 py-2"
            >
              <div className="text-xs">
                <div className="font-semibold">
                  {formatRupiah(r.amount)} · {r.who}
                </div>
                <div className="text-[10px] text-text-3">
                  Tiap tanggal {r.dayOfMonth} · berikutnya {r.nextDue}
                </div>
              </div>
              <button
                onClick={() =>
                  userId && deleteRecurringGoal(userId, r.id)
                }
                className="text-[11px] text-[color:var(--negative)] hover:underline"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}
      {showAdd && (
        <RecurringGoalSheet
          goalId={goal.id}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function RecurringGoalSheet({
  goalId,
  onClose,
}: {
  goalId: string;
  onClose: () => void;
}) {
  const userId = useAuth((s) => s.userId);
  const members = useWorkspace((s) => s.members);
  const people = useMemo(
    () => (members.length === 0 ? ["Saya"] : members.map((m) => m.name)),
    [members],
  );
  const [amount, setAmount] = useState("");
  const [who, setWho] = useState(people[0]);
  const [day, setDay] = useState("1");

  async function submit() {
    if (!userId) return;
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) return;
    await upsertRecurringGoal(userId, {
      goalId,
      amount: num,
      who,
      dayOfMonth: parseInt(day, 10) || 1,
      active: true,
    });
    onClose();
  }

  return (
    <Sheet title="Auto-deposit bulanan" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nominal/bulan">
          <input
            className="input-base font-mono"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Atas nama">
            <select
              className="input-base"
              value={who}
              onChange={(e) => setWho(e.target.value)}
            >
              {people.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Tanggal (1–28)">
            <input
              className="input-base font-mono"
              inputMode="numeric"
              value={day}
              onChange={(e) =>
                setDay(e.target.value.replace(/[^\d]/g, "").slice(0, 2))
              }
            />
          </Field>
        </div>
        <button
          onClick={submit}
          disabled={!amount}
          className="btn-accent w-full text-sm disabled:opacity-50"
        >
          Aktifkan
        </button>
      </div>
    </Sheet>
  );
}

function PredictionPanel({ goal }: { goal: GoalRecord }) {
  const userId = useAuth((s) => s.userId);
  const deposits = useDeposits(userId);
  const pred = predictGoal(goal, deposits ?? []);

  return (
    <div className="surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-text-3">
          Prediksi (data historis)
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            pred.confidence === "tinggi"
              ? "bg-positive-bg text-[color:var(--positive)]"
              : pred.confidence === "sedang"
                ? "bg-info-bg text-[color:var(--info)]"
                : "bg-warning-bg text-[color:var(--warning)]"
          }`}
        >
          {pred.confidence}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-text-1">{pred.summary}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <PredStat
          value={formatRupiahShort(pred.weeklyRate)}
          label="Rata-rata/minggu"
        />
        <PredStat
          value={formatRupiahShort(pred.remaining)}
          label="Sisa target"
        />
        <PredStat
          value={`${Math.round(pred.consistency * 100)}%`}
          label="Konsistensi"
        />
      </div>
    </div>
  );
}

function PredStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-bg-elev2 p-2 text-center theme-transition">
      <div className="font-mono text-sm font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-text-3">
        {label}
      </div>
    </div>
  );
}

function GoalSheet({
  goal,
  onClose,
}: {
  goal?: GoalRecord;
  onClose: () => void;
}) {
  const userId = useAuth((s) => s.userId);
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? String(goal.target) : "");
  const [category, setCategory] = useState<GoalRecord["category"]>(
    goal?.category ?? "savings",
  );
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [milestonesText, setMilestonesText] = useState(
    (goal?.milestones ?? [25, 50, 75, 100]).join(", "),
  );

  async function submit() {
    if (!userId) return;
    const num = parseFloat(target);
    if (!name.trim() || !Number.isFinite(num) || num <= 0) return;
    const opt = CATEGORY_OPTIONS.find((c) => c.id === category);
    const ms = milestonesText
      .split(/[,\s]+/)
      .map((s) => parseFloat(s))
      .filter((n) => Number.isFinite(n) && n > 0 && n <= 100)
      .sort((a, b) => a - b);
    await upsertGoal(userId, {
      id: goal?.id,
      name: name.trim(),
      target: num,
      category,
      emoji: goal?.emoji ?? opt?.emoji ?? "🎯",
      deadline: deadline || undefined,
      milestones: ms.length > 0 ? ms : undefined,
    });
    onClose();
  }

  return (
    <Sheet title={goal ? "Edit goal" : "Goal baru"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nama">
          <input
            className="input-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mis. Dana Nikah"
          />
        </Field>
        <Field label="Target (Rp)">
          <input
            className="input-base font-mono"
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
          />
        </Field>
        <Field label="Kategori">
          <div className="grid grid-cols-4 gap-2">
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`rounded-md p-2 text-xs font-semibold transition-colors ${
                  category === c.id
                    ? "bg-accent text-accent-fg"
                    : "bg-bg-elev2 text-text-2"
                }`}
              >
                <div className="text-base">{c.emoji}</div>
                <div className="mt-0.5">{c.label}</div>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Deadline (opsional)">
          <input
            className="input-base"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </Field>
        <Field label="Milestone % (pisah koma)">
          <input
            className="input-base font-mono text-sm"
            value={milestonesText}
            onChange={(e) => setMilestonesText(e.target.value)}
            placeholder="25, 50, 75, 100"
          />
        </Field>
        <button onClick={submit} className="btn-accent w-full text-sm">
          {goal ? "Simpan perubahan" : "Bikin goal"}
        </button>
      </div>
    </Sheet>
  );
}

function DepositSheet({
  goal,
  onClose,
}: {
  goal: GoalRecord;
  onClose: () => void;
}) {
  const userId = useAuth((s) => s.userId);
  const members = useWorkspace((s) => s.members);
  const people = useMemo(
    () => (members.length === 0 ? ["Saya"] : members.map((m) => m.name)),
    [members],
  );
  const [amount, setAmount] = useState("");
  const [who, setWho] = useState(people[0]);
  useEffect(() => {
    if (!people.includes(who)) setWho(people[0]);
  }, [people, who]);
  const [note, setNote] = useState("");

  async function submit() {
    if (!userId) return;
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) return;
    await addDeposit(userId, {
      goalId: goal.id,
      amount: num,
      who,
      note: note.trim() || undefined,
      date: todayISO(),
    });
    onClose();
  }

  return (
    <Sheet title={`Setoran · ${goal.name}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nominal">
          <input
            className="input-base font-mono"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
          />
        </Field>
        <Field label="Siapa">
          <select
            className="input-base"
            value={who}
            onChange={(e) => setWho(e.target.value)}
          >
            {people.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Catatan (opsional)">
          <input
            className="input-base"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <button onClick={submit} className="btn-accent w-full text-sm">
          Simpan setoran
        </button>
      </div>
    </Sheet>
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
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-3">
        {label}
      </span>
      {children}
    </label>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0">
      <div className="mx-auto w-full max-w-[480px] rounded-t-[20px] bg-bg-app p-5 pb-[calc(20px+var(--sab))] slide-up theme-transition">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-bg-elev3" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="text-xl text-text-3"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
