"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sheet, Field, FieldGroup, Chips } from "@/components/ui/Sheet";
import { useAuth } from "@/stores/auth";
import { deleteBudget, upsertBudget, useBudgets } from "@/stores/data";
import { budgetUsage } from "@/lib/budget";
import { formatRupiahShort, formatMoneyInput } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptic";
import type { BudgetRecord, TransactionRecord } from "@/lib/db";

const BAR = { ok: "var(--accent)", warn: "var(--warning)", over: "var(--negative)" } as const;

/** Monthly limits per category with progress, on the Uang page. */
export function BudgetCard({ txs, month, categories }: { txs: TransactionRecord[]; month: string; categories: string[] }) {
  const userId = useAuth((s) => s.userId);
  const budgets = useBudgets(userId) ?? [];
  const usage = budgetUsage(budgets, txs, month);
  const reduce = useReducedMotion();
  const [editing, setEditing] = useState<BudgetRecord | "new" | null>(null);
  const day = new Date().getDate();
  const dim = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const monthPct = Math.min(1, day / dim);

  return (
    <div className="surface mt-3 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[14px] font-bold text-text-1">Batas belanja bulan ini</span>
        <button type="button" onClick={() => setEditing("new")} className="inline-flex min-h-[44px] items-center rounded-lg px-2 text-[12px] font-semibold text-accent">
          + Atur
        </button>
      </div>
      {usage.length === 0 ? (
        <button type="button" onClick={() => setEditing("new")} className="min-h-[44px] w-full py-1 text-left text-[13px] leading-relaxed text-text-3">
          Pasang batas per kategori, nanti diingatkan di 80%.
        </button>
      ) : (
        <div className="space-y-3">
          {usage.map((u) => (
            <button type="button" key={u.budget.id} onClick={() => setEditing(u.budget)} className="block min-h-[44px] w-full text-left">
              <div className="mb-1 flex items-baseline justify-between text-[13px]">
                <span className="font-semibold text-text-1">
                  {u.budget.category}
                  {u.level === "over" ? " · lewat batas" : ""}
                </span>
                <span className={u.level === "ok" ? "text-text-3" : u.level === "warn" ? "text-[color:var(--warning)]" : "text-[color:var(--negative)]"}>
                  <span className="font-semibold tabular-nums">{formatRupiahShort(u.spent)}</span> / {formatRupiahShort(u.budget.limit)}
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-bg-elev2">
                <motion.div
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: Math.min(1, u.ratio) }}
                  transition={reduce ? { duration: 0.05 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full w-full rounded-full"
                  style={{ originX: 0, background: BAR[u.level] }}
                />
                {/* Where spending "should" be by today if spread evenly. */}
                <span aria-hidden className="absolute inset-y-0 w-[2px] bg-text-4/60" style={{ left: `${monthPct * 100}%` }} />
              </div>
              <div className="mt-1 text-[12px] text-text-4">
                {u.level === "over"
                  ? `Lewat ${formatRupiahShort(u.spent - u.budget.limit)}`
                  : `Sisa ${formatRupiahShort(u.budget.limit - u.spent)} · ±${formatRupiahShort(Math.max(0, (u.budget.limit - u.spent) / Math.max(1, dim - day + 1)))}/hari`}
              </div>
            </button>
          ))}
        </div>
      )}
      <AnimatePresence>
        {editing && userId && (
          <LimitSheet
            key={editing === "new" ? "new" : editing.id}
            userId={userId}
            record={editing === "new" ? null : editing}
            categories={categories.filter((c) => editing !== "new" || !budgets.some((b) => b.category === c))}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LimitSheet({
  userId,
  record,
  categories,
  onClose,
}: {
  userId: string;
  record: BudgetRecord | null;
  categories: string[];
  onClose: () => void;
}) {
  const [category, setCategory] = useState(record?.category ?? categories[0] ?? "Lainnya");
  const [limit, setLimit] = useState(record?.limit ?? 0);

  async function save() {
    if (!limit) return;
    await upsertBudget(userId, { id: record?.id, category, limit });
    hapticSuccess();
    onClose();
  }
  async function remove() {
    if (record) await deleteBudget(userId, record.id);
    onClose();
  }

  return (
    <Sheet
      title={record ? `Batas ${record.category}` : "Batas baru"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {record && (
            <button type="button" onClick={remove} className="min-h-[48px] rounded-full bg-bg-elev2 px-4 text-[14px] font-semibold text-[color:var(--negative)]">
              Hapus
            </button>
          )}
          <button type="button" onClick={save} disabled={!limit} className="btn-accent min-h-[48px] flex-1 disabled:opacity-50">
            Simpan
          </button>
        </div>
      }
    >
      {!record && (
        <FieldGroup label="Kategori">
          <Chips options={categories.map((c) => ({ value: c, label: c }))} value={category} onChange={setCategory} />
        </FieldGroup>
      )}
      <Field label="Batas per bulan">
        <input
          className="input-base tabular-nums"
          inputMode="numeric"
          placeholder="Rp0"
          value={limit ? formatMoneyInput(limit) : ""}
          onChange={(e) => setLimit(Number(e.target.value.replace(/\D/g, "")) || 0)}
          autoFocus
        />
      </Field>
      <div className="flex flex-wrap gap-1.5">
        {[300_000, 500_000, 1_000_000, 1_500_000, 2_000_000].map((v) => (
          <button type="button" key={v} onClick={() => setLimit(v)} className="min-h-[44px] rounded-full bg-bg-elev2 px-3.5 py-2 text-[12px] font-semibold text-text-2">
            {formatRupiahShort(v)}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
