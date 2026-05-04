"use client";

import Link from "next/link";
import { useAuth } from "@/stores/auth";
import { useTransactions } from "@/stores/data";
import { WidgetShell } from "./WidgetShell";
import { formatRupiah, formatDateShort } from "@/lib/utils";

export function TransactionsWidget() {
  const userId = useAuth((s) => s.userId);
  const txs = useTransactions(userId);

  const recent = (txs ?? []).slice(0, 5);

  return (
    <WidgetShell
      title="Transaksi"
      action={
        <Link
          href="/tracker"
          className="text-[11px] text-text-3 hover:text-text-1"
        >
          Semua
        </Link>
      }
    >
      {recent.length === 0 ? (
        <p className="text-[12px] text-text-4">Belum ada transaksi.</p>
      ) : (
        <ul className="divide-y divide-border">
          {recent.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-text-1">
                  {t.note || t.category}
                </div>
                <div className="mt-0.5 text-[10px] text-text-4">
                  {t.who} · {formatDateShort(t.date)}
                </div>
              </div>
              <div
                className={`font-mono text-[12px] font-medium tabular-nums ${
                  t.kind === "in"
                    ? "text-[color:var(--positive)]"
                    : "text-text-1"
                }`}
              >
                {t.kind === "in" ? "+" : "−"}{formatRupiah(t.amount)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}
