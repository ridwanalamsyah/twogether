"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { useDeposits } from "@/stores/data";
import { formatRupiah } from "@/lib/utils";

const NISAB_GRAM = 85; // emas
const RATE = 0.025;
const KEY = "twogether:zakat";

interface ZakatInput {
  jiwa: number;
  fitrahPerJiwa: number;
  hargaEmas: number;
  tabungan: number;
  emas: number;
  investasi: number;
  piutang: number;
  hutang: number;
  gaji: number;
}

const DEFAULTS: ZakatInput = {
  jiwa: 2,
  fitrahPerJiwa: 45_000,
  hargaEmas: 0,
  tabungan: 0,
  emas: 0,
  investasi: 0,
  piutang: 0,
  hutang: 0,
  gaji: 0,
};

export default function ZakatPage() {
  const userId = useAuth((s) => s.userId);
  const deposits = useDeposits(userId) ?? [];
  const saved = deposits.reduce((s, d) => s + d.amount, 0);
  const [v, setV] = useState<ZakatInput>(DEFAULTS);
  const [tab, setTab] = useState<"fitrah" | "mal" | "penghasilan">("fitrah");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setV({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  }, [v]);

  const nisab = v.hargaEmas * NISAB_GRAM;
  const harta = v.tabungan + v.emas + v.investasi + v.piutang - v.hutang;
  const wajibMal = v.hargaEmas > 0 && harta >= nisab;
  const nisabBulanan = nisab / 12;
  const wajibGaji = v.hargaEmas > 0 && v.gaji >= nisabBulanan;

  const result = useMemo(() => {
    if (tab === "fitrah") return { amount: v.jiwa * v.fitrahPerJiwa, note: `${v.jiwa} jiwa × ${formatRupiah(v.fitrahPerJiwa)} (atau ${(v.jiwa * 2.5).toLocaleString("id-ID")} kg beras)` };
    if (tab === "mal")
      return v.hargaEmas <= 0
        ? { amount: null, note: "Isi harga emas per gram dulu untuk menghitung nisab." }
        : wajibMal
          ? { amount: Math.round(harta * RATE), note: `Harta ${formatRupiah(harta)} sudah mencapai nisab ${formatRupiah(nisab)} — wajib 2,5% bila sudah tersimpan 1 tahun.` }
          : { amount: 0, note: `Belum wajib: harta ${formatRupiah(Math.max(0, harta))} di bawah nisab ${formatRupiah(nisab)}.` };
    return v.hargaEmas <= 0
      ? { amount: null, note: "Isi harga emas per gram dulu untuk menghitung nisab." }
      : wajibGaji
        ? { amount: Math.round(v.gaji * RATE), note: `Penghasilan sebulan mencapai nisab bulanan ${formatRupiah(nisabBulanan)}.` }
        : { amount: 0, note: `Belum wajib: di bawah nisab bulanan ${formatRupiah(nisabBulanan)}.` };
  }, [tab, v, harta, nisab, wajibMal, wajibGaji, nisabBulanan]);

  const num = (k: keyof ZakatInput) => ({
    value: v[k] ? formatRupiah(v[k]) : "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setV({ ...v, [k]: Number(e.target.value.replace(/\D/g, "")) || 0 }),
  });

  return (
    <div>
      <AppHeader title="Zakat" />
      <div className="space-y-4 px-5 pb-10 pt-3">
        <div
          className="rounded-[24px] p-5 text-white shadow-float"
          style={{ background: "linear-gradient(135deg,#0f7a5c,#d9b24c)" }}
        >
          <div className="text-[13px] font-semibold text-white/85">
            Zakat {tab === "fitrah" ? "fitrah" : tab === "mal" ? "mal (harta)" : "penghasilan / bulan"}
          </div>
          <div className="mt-1 font-mono text-[34px] font-extrabold leading-tight">
            {result.amount == null ? "—" : formatRupiah(result.amount)}
          </div>
          <div className="mt-1 text-[13px] leading-snug text-white/85">{result.note}</div>
        </div>

        <div className="relative grid grid-cols-3 rounded-[12px] bg-bg-elev2 p-1 text-[13px]">
          <span
            aria-hidden
            className="absolute bottom-1 left-1 top-1 w-[calc((100%-8px)/3)] rounded-[9px] bg-bg-card shadow-sm transition-transform duration-300 ease-ios"
            style={{ transform: `translateX(${["fitrah", "mal", "penghasilan"].indexOf(tab) * 100}%)` }}
          />
          {(["fitrah", "mal", "penghasilan"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative py-2 font-semibold ${tab === t ? "text-text-1" : "text-text-3"}`}>
              {t === "fitrah" ? "Fitrah" : t === "mal" ? "Harta" : "Penghasilan"}
            </button>
          ))}
        </div>

        <div className="surface space-y-3 p-4">
          {tab === "fitrah" ? (
            <>
              <Row label="Jumlah jiwa">
                <div className="flex items-center gap-3">
                  <button onClick={() => setV({ ...v, jiwa: Math.max(1, v.jiwa - 1) })} className="grid h-10 w-10 place-items-center rounded-full bg-bg-elev2 text-[18px] font-bold">−</button>
                  <span className="w-8 text-center font-mono text-[20px] font-extrabold">{v.jiwa}</span>
                  <button onClick={() => setV({ ...v, jiwa: v.jiwa + 1 })} className="grid h-10 w-10 place-items-center rounded-full bg-bg-elev2 text-[18px] font-bold">+</button>
                </div>
              </Row>
              <Row label="Per jiwa (sesuai ketetapan daerahmu)">
                <input className="input-base" inputMode="numeric" {...num("fitrahPerJiwa")} />
              </Row>
            </>
          ) : (
            <>
              <Row label="Harga emas per gram (cek harga hari ini)">
                <input className="input-base" inputMode="numeric" placeholder="Rp 0" {...num("hargaEmas")} />
              </Row>
              {tab === "mal" ? (
                <>
                  <Row label="Tabungan & deposito">
                    <input className="input-base" inputMode="numeric" placeholder="Rp 0" {...num("tabungan")} />
                    {saved > 0 && v.tabungan === 0 && (
                      <button onClick={() => setV({ ...v, tabungan: saved })} className="mt-1 text-[12px] font-semibold text-accent">
                        Pakai total Goals: {formatRupiah(saved)}
                      </button>
                    )}
                  </Row>
                  <Row label="Emas / perak (nilai rupiah)"><input className="input-base" inputMode="numeric" placeholder="Rp 0" {...num("emas")} /></Row>
                  <Row label="Saham, reksa dana, kripto"><input className="input-base" inputMode="numeric" placeholder="Rp 0" {...num("investasi")} /></Row>
                  <Row label="Piutang yang bisa ditagih"><input className="input-base" inputMode="numeric" placeholder="Rp 0" {...num("piutang")} /></Row>
                  <Row label="Hutang jatuh tempo (pengurang)"><input className="input-base" inputMode="numeric" placeholder="Rp 0" {...num("hutang")} /></Row>
                </>
              ) : (
                <Row label="Penghasilan per bulan">
                  <input className="input-base" inputMode="numeric" placeholder="Rp 0" {...num("gaji")} />
                </Row>
              )}
              {v.hargaEmas > 0 && (
                <p className="text-[12px] text-text-3">
                  Nisab = {NISAB_GRAM} gram emas = {formatRupiah(nisab)}
                </p>
              )}
            </>
          )}
        </div>

        <p className="px-1 text-[11px] leading-snug text-text-4">
          Perhitungan ini perkiraan berdasarkan ketentuan umum (nisab 85 gram emas, kadar 2,5%).
          Untuk kepastian, tanyakan ke ustadz/lembaga amil zakat (mis. BAZNAS).
        </p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-semibold text-text-3">{label}</div>
      {children}
    </div>
  );
}
