"use client";

import { useState } from "react";
import { Sheet, Field, FieldGroup, Chips } from "@/components/ui/Sheet";
import { useAuth } from "@/stores/auth";
import { deleteBudget, upsertBudget, useBudgets } from "@/stores/data";
import { budgetUsage } from "@/lib/budget";
import { formatRupiah, formatRupiahShort } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptic";
import type { BudgetRecord, TransactionRecord } from "@/lib/db";

const BAR = { ok: "var(--accent)", warn: "var(--warning)", over: "var(--negative)" } as const;

/** Monthly limits per category with progress, on the Uang page. */
export function BudgetCard({ txs, month, categories }: { txs: TransactionRecord[]; month: string; categories: string[] }) {
  const userId = useAuth((s) => s.userId);
  const budgets = useBudgets(userId) ?? [];
  const usage = budgetUsage(budgets, txs, month);
  const [editing, setEditing] = useState<BudgetRecord | "new" | null>(null);
  const day = new Date().getDate();
  const dim = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const monthPct = Math.min(1, day / dim);

  return (
    <div className="surface mt-3 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[14px] font-bold text-text-1">Batas belanja bulan ini</span>
        <button onClick={() => setEditing("new")} className="text-[12px] font-semibold text-accent">
          + Atur
        </button>
      </div>
      {usage.length === 0 ? (
        <button onClick={() => setEditing("new")} className="w-full rounded-2xl bg-bg-elev1 px-3 py-3 text-left text-[13px] text-text-3">
          Pasang batas per kategori (mis. Makan Rp 1,5jt) — nanti diingatkan saat sudah 80%.
        </button>
      ) : (
        <div className="space-y-3">
          {usage.map((u) => (
            <button key={u.budget.id} onClick={() => setEditing(u.budget)} className="block w-full text-left">
              <div className="mb-1 flex items-baseline justify-between text-[13px]">
                <span className="font-semibold text-text-1">
                  {u.budget.category}
                  {u.level === "over" ? " ⚠️" : ""}
                </span>
                <span className={u.level === "ok" ? "text-text-3" : u.level === "warn" ? "text-[color:var(--warning)]" : "text-[color:var(--negative)]"}>
                  <span className="font-mono font-semibold">{formatRupiahShort(u.spent)}</span> / {formatRupiahShort(u.budget.limit)}
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-bg-elev2">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, u.ratio * 100)}%`, background: BAR[u.level] }} />
                {/* Where spending "should" be by today if spread evenly. */}
                <span aria-hidden className="absolute inset-y-0 w-[2px] bg-text-4/60" style={{ left: `${monthPct * 100}%` }} />
              </div>
              <div className="mt-0.5 text-[11px] text-text-4">
                {u.level === "over"
                  ? `Lewat ${formatRupiahShort(u.spent - u.budget.limit)}`
                  : `Sisa ${formatRupiahShort(u.budget.limit - u.spent)} · ±${formatRupiahShort(Math.max(0, (u.budget.limit - u.spent) / Math.max(1, dim - day + 1)))}/hari`}
              </div>
            </button>
          ))}
        </div>
      )}
      {editing && userId && (
        <LimitSheet
          userId={userId}
          record={editing === "new" ? null : editing}
          categories={categories.filter((c) => editing !== "new" || !budgets.some((b) => b.category === c))}
          onClose={() => setEditing(null)}
        />
      )}
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
            <button onClick={remove} className="rounded-full bg-bg-elev2 px-4 text-[14px] font-semibold text-[color:var(--negative)]">
              Hapus
            </button>
          )}
          <button onClick={save} disabled={!limit} className="btn-accent flex-1 disabled:opacity-50">
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
          className="input-base"
          inputMode="numeric"
          placeholder="Rp 0"
          value={limit ? formatRupiah(limit) : ""}
          onChange={(e) => setLimit(Number(e.target.value.replace(/\D/g, "")) || 0)}
          autoFocus
        />
      </Field>
      <div className="flex flex-wrap gap-1.5">
        {[300_000, 500_000, 1_000_000, 1_500_000, 2_000_000].map((v) => (
          <button key={v} onClick={() => setLimit(v)} className="rounded-full bg-bg-elev2 px-3 py-1.5 text-[12px] font-semibold text-text-2">
            {formatRupiahShort(v)}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
