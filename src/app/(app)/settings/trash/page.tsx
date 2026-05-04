"use client";

import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import {
  emptyTrash,
  purgeFromTrash,
  restoreFromTrash,
  useTrash,
} from "@/stores/data";

export default function TrashPage() {
  const userId = useAuth((s) => s.userId);
  const items = useTrash(userId) ?? [];

  function fmtAge(ts: number): string {
    const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
    if (days <= 0) return "hari ini";
    if (days === 1) return "kemarin";
    return `${days} hari lalu`;
  }

  return (
    <div className="animate-in">
      <AppHeader
        title="Sampah"
        subtitle={`${items.length} item terhapus`}
        actions={
          <Link
            href="/settings"
            className="rounded-full bg-bg-elev2 px-3 py-1.5 text-xs font-semibold text-text-2"
          >
            Selesai
          </Link>
        }
      />
      <div className="space-y-3 px-4 pb-8">
        <div className="rounded-md bg-bg-elev2 p-3 text-[11px] text-text-3">
          Item dipindahkan ke sini saat dihapus. Kamu bisa pulihkan dalam 30
          hari sebelum benar-benar hilang.
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-text-4">Sampah kosong.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={`${it.table}:${it.id}`}
                className="surface flex items-center justify-between p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {it.preview}
                  </div>
                  <div className="text-[11px] text-text-3">
                    {it.table} · {fmtAge(it.deletedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restoreFromTrash(it.table, it.id)}
                    className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-accent-fg"
                  >
                    Pulihkan
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Hapus permanen?")) purgeFromTrash(it.table, it.id);
                    }}
                    className="rounded-full bg-bg-elev2 px-3 py-1.5 text-[11px] font-semibold text-[color:var(--negative)]"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && userId && (
          <button
            onClick={() => {
              if (
                confirm(
                  `Kosongkan sampah? ${items.length} item akan dihapus permanen.`,
                )
              ) {
                void emptyTrash(userId);
              }
            }}
            className="btn-danger w-full text-sm"
          >
            Kosongkan sampah
          </button>
        )}
      </div>
    </div>
  );
}
