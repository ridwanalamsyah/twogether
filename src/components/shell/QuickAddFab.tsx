"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import { upsertEntry } from "@/stores/data";
import { todayISO } from "@/lib/utils";

/**
 * Floating Action Button for quick logging of common entries:
 * water +1, mood pick, expense, transfer to goal, etc.
 *
 * Tap FAB → 6 quick-action shortcuts in a sheet.
 */
export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const userId = useAuth((s) => s.userId);
  const meName = useWorkspace((s) => s.members.find((m) => m.isMe)?.name);

  async function logWater() {
    if (!userId) return;
    await upsertEntry(userId, {
      kind: "water",
      date: todayISO(),
      valueNum: 1,
      who: meName,
    });
    setOpen(false);
  }

  async function logMood(score: number) {
    if (!userId) return;
    await upsertEntry(userId, {
      kind: "mood",
      date: todayISO(),
      valueNum: score,
      who: meName,
    });
    setOpen(false);
  }

  return (
    <>
      <button
        aria-label="Quick add"
        onClick={() => setOpen(true)}
        className="fixed bottom-[88px] right-4 z-30 grid h-12 w-12 place-items-center rounded-full border border-text-1 bg-bg-app text-[24px] leading-none text-text-1 shadow-md active:scale-95"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/30"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto w-full max-w-[480px] rounded-t-xl border-t border-border bg-bg-app p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[14px] font-medium">Catat cepat</div>
              <button
                onClick={() => setOpen(false)}
                className="text-[12px] text-text-3"
              >
                Tutup
              </button>
            </div>

            <div className="mb-4">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-text-3">
                Cepat
              </div>
              <div className="grid grid-cols-3 gap-2">
                <QuickBtn label="+1 air" onClick={logWater} />
                <QuickBtn
                  label="Mood 😀"
                  onClick={() => logMood(5)}
                />
                <QuickBtn
                  label="Mood 😐"
                  onClick={() => logMood(3)}
                />
                <QuickBtn
                  label="Mood 😢"
                  onClick={() => logMood(1)}
                />
                <QuickBtn
                  label="Olahraga"
                  onClick={() => {
                    setOpen(false);
                    router.push("/sehat");
                  }}
                />
                <QuickBtn
                  label="Tidur"
                  onClick={() => {
                    setOpen(false);
                    router.push("/sehat");
                  }}
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-text-3">
                Keuangan
              </div>
              <div className="grid grid-cols-3 gap-2">
                <QuickBtn
                  label="Pengeluaran"
                  onClick={() => {
                    setOpen(false);
                    router.push("/tracker?add=out");
                  }}
                />
                <QuickBtn
                  label="Pemasukan"
                  onClick={() => {
                    setOpen(false);
                    router.push("/tracker?add=in");
                  }}
                />
                <QuickBtn
                  label="Setor goal"
                  onClick={() => {
                    setOpen(false);
                    router.push("/goals");
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 text-[10px] uppercase tracking-wider text-text-3">
                Catatan
              </div>
              <div className="grid grid-cols-3 gap-2">
                <QuickBtn
                  label="Jurnal"
                  onClick={() => {
                    setOpen(false);
                    router.push("/belajar");
                  }}
                />
                <QuickBtn
                  label="Apresiasi"
                  onClick={() => {
                    setOpen(false);
                    router.push("/kita");
                  }}
                />
                <QuickBtn
                  label="Moment"
                  onClick={() => {
                    setOpen(false);
                    router.push("/moments");
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function QuickBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-border px-3 py-3 text-[12px] text-text-1 active:bg-bg-elev1"
    >
      {label}
    </button>
  );
}
