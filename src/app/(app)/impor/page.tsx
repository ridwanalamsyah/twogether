"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { addTransaction, useTransactions } from "@/stores/data";
import { useWallets } from "@/components/wallet/Wallets";
import { usePeople } from "@/lib/people";
import { walletOf, withWallet } from "@/lib/wallet";
import { extractRows, guessCategory, guessColumns, parseCsv, type ColumnMap, type ParsedRow } from "@/lib/csvImport";
import { formatRupiah } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptic";

const FIELDS: { key: keyof ColumnMap; label: string; optional?: boolean }[] = [
  { key: "date", label: "Tanggal" },
  { key: "desc", label: "Keterangan", optional: true },
  { key: "amount", label: "Jumlah", optional: true },
  { key: "dbcr", label: "Penanda DB/CR", optional: true },
  { key: "debit", label: "Kolom keluar (debit)", optional: true },
  { key: "credit", label: "Kolom masuk (kredit)", optional: true },
];

export default function ImporPage() {
  const router = useRouter();
  const userId = useAuth((s) => s.userId);
  const { me, all } = usePeople();
  const existing = useTransactions(userId) ?? [];
  const { wallets } = useWallets();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [map, setMap] = useState<ColumnMap | null>(null);
  const [fileName, setFileName] = useState("");
  const [walletId, setWalletId] = useState<string | null>(null);
  const [who, setWho] = useState(me);
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const parsed: (ParsedRow & { dup: boolean; category: string })[] = useMemo(() => {
    if (!rows || !map) return [];
    return extractRows(rows, map).map((r) => ({
      ...r,
      category: guessCategory(r.note),
      dup: existing.some(
        (t) =>
          t.date === r.date &&
          t.amount === r.amount &&
          t.kind === r.kind &&
          (!walletId || walletOf(t) === walletId || !walletOf(t)),
      ),
    }));
  }, [rows, map, existing, walletId]);

  async function onFile(f: File) {
    setFileName(f.name);
    const text = await f.text();
    const r = parseCsv(text);
    setRows(r);
    setMap(guessColumns(r));
    setSkip(new Set());
    setDone(null);
  }

  async function doImport() {
    if (!userId) return;
    setBusy(true);
    let n = 0;
    for (const [i, r] of parsed.entries()) {
      if (r.dup || skip.has(i)) continue;
      await addTransaction(userId, {
        kind: r.kind,
        amount: r.amount,
        category: r.category,
        who,
        note: r.note || undefined,
        date: r.date,
        tags: withWallet(["impor"], walletId),
      });
      n += 1;
    }
    setBusy(false);
    setDone(n);
    hapticSuccess();
  }

  const header = rows && map && map.header >= 0 ? rows[map.header] : rows?.[0] ?? [];
  const colOptions = header.map((h, i) => ({ i, label: h || `Kolom ${i + 1}` }));
  const toImport = parsed.filter((r, i) => !r.dup && !skip.has(i));

  return (
    <div>
      <AppHeader title="Impor mutasi" />
      <div className="space-y-4 px-5 pb-10 pt-3">
        {done != null ? (
          <div className="surface p-6 text-center">
            <div className="text-[40px]">✅</div>
            <div className="mt-2 text-[17px] font-extrabold text-text-1">{done} transaksi masuk</div>
            <button onClick={() => router.push("/tracker")} className="btn-accent mt-4 w-full">Lihat di Uang</button>
          </div>
        ) : !rows ? (
          <div className="surface p-5">
            <div className="text-[15px] font-bold text-text-1">Masukkan mutasi rekening / e-wallet</div>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-text-2">
              <li>Unduh mutasi dalam format <b>CSV</b> dari internet/mobile banking (mis. KlikBCA → Mutasi Rekening → Unduh).</li>
              <li>Pilih filenya di sini, cek, lalu impor.</li>
            </ol>
            <button onClick={() => fileRef.current?.click()} className="btn-accent mt-4 w-full">Pilih file CSV</button>
            <p className="mt-2 text-[12px] text-text-4">File dibaca di HP ini saja, tidak diunggah ke mana pun.</p>
          </div>
        ) : (
          <>
            <div className="surface space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="truncate text-[14px] font-bold text-text-1">📄 {fileName}</span>
                <button onClick={() => fileRef.current?.click()} className="text-[12px] font-semibold text-accent">Ganti</button>
              </div>
              {wallets.length > 0 && (
                <label className="block">
                  <span className="mb-1 block text-[12px] font-semibold text-text-3">Masuk ke dompet</span>
                  <select className="input-base" value={walletId ?? ""} onChange={(e) => setWalletId(e.target.value || null)}>
                    <option value="">Tanpa dompet</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-text-3">Atas nama</span>
                <select className="input-base" value={who} onChange={(e) => setWho(e.target.value)}>
                  {all.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <details>
                <summary className="cursor-pointer text-[13px] font-semibold text-text-2">Atur kolom (kalau hasilnya salah)</summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {FIELDS.map((f) => (
                    <label key={f.key} className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-text-3">{f.label}</span>
                      <select
                        className="input-base h-10 text-[13px]"
                        value={map?.[f.key] ?? -1}
                        onChange={(e) => map && setMap({ ...map, [f.key]: Number(e.target.value) })}
                      >
                        <option value={-1}>—</option>
                        {colOptions.map((c) => <option key={c.i} value={c.i}>{c.label}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </details>
            </div>

            <div className="flex items-baseline justify-between px-1">
              <span className="text-[15px] font-extrabold text-text-1">{parsed.length} baris terbaca</span>
              <span className="text-[12px] text-text-3">{parsed.filter((r) => r.dup).length} sudah ada</span>
            </div>
            {parsed.length === 0 ? (
              <div className="rounded-[20px] border-2 border-dashed border-border py-8 text-center text-[13px] text-text-3">
                Belum ada baris yang terbaca. Coba atur kolom di atas.
              </div>
            ) : (
              <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
                {parsed.slice(0, 300).map((r, i) => (
                  <li key={i} className={`flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 ${r.dup ? "opacity-50" : ""}`}>
                    <input
                      type="checkbox"
                      disabled={r.dup}
                      checked={!r.dup && !skip.has(i)}
                      onChange={() => {
                        const next = new Set(skip);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        setSkip(next);
                      }}
                      className="h-4 w-4 accent-[color:var(--accent)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] text-text-1">{r.note || "(tanpa keterangan)"}</div>
                      <div className="text-[11px] text-text-4">{r.date} · {r.category}{r.dup ? " · sudah ada" : ""}</div>
                    </div>
                    <span className={`font-mono text-[13px] font-semibold ${r.kind === "in" ? "text-[color:var(--positive)]" : "text-text-1"}`}>
                      {r.kind === "in" ? "+" : "−"}{formatRupiah(r.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={doImport} disabled={busy || toImport.length === 0} className="btn-accent w-full disabled:opacity-50">
              {busy ? "Mengimpor…" : `Impor ${toImport.length} transaksi`}
            </button>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,.txt"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
