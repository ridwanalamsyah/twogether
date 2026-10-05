/**
 * Bank / e-wallet statement (CSV) → transactions. Pure functions so they can
 * be unit-tested. Handles quoted CSV, ; , or tab delimiters, preamble lines
 * before the table (BCA), "DB"/"CR" markers, separate debit/credit columns,
 * and both 1.234.567,89 and 1,234,567.89 number styles.
 */

export function parseCsv(text: string): string[][] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return [];
  const sample = lines.slice(0, 20).join("\n");
  const delim = [";", "\t", ","]
    .map((d) => ({ d, n: sample.split(d).length }))
    .sort((a, b) => b.n - a.n)[0].d;
  return lines.map((line) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === delim) {
        out.push(cur.trim());
        cur = "";
      } else cur += c;
    }
    out.push(cur.trim());
    return out;
  });
}

/** "Rp 1.234.567,89" / "1,234,567.89" / "-50.000" / "50,000.00 DB" → number (sign kept). */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const neg = /^\s*-|\(.*\)|\bDB\b|\bD\b\s*$/i.test(raw);
  let s = raw.replace(/[^\d.,]/g, "");
  if (!s || !/\d/.test(s)) return null;
  const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  if (lastSep !== -1 && s.length - lastSep - 1 === 2) {
    // Two digits after the last separator → decimals.
    s = s.slice(0, lastSep).replace(/[.,]/g, "") + "." + s.slice(lastSep + 1);
  } else {
    s = s.replace(/[.,]/g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

/** Many date styles → YYYY-MM-DD. `fallbackYear` for "DD/MM". */
export function parseDate(raw: string, fallbackYear = new Date().getFullYear()): string | null {
  const s = raw.trim().replace(/^'/, "");
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return fmt(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return fmt(y, +m[2], +m[1]);
  }
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (m) return fmt(fallbackYear, +m[2], +m[1]);
  const months = ["jan", "feb", "mar", "apr", "mei|may", "jun", "jul", "agu|aug", "sep", "okt|oct", "nov", "des|dec"];
  m = s.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);
  if (m) {
    const mi = months.findIndex((p) => new RegExp(`^(${p})`, "i").test(m![2]));
    if (mi !== -1) return fmt(+m[3], mi + 1, +m[1]);
  }
  return null;
}

function fmt(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export interface ColumnMap {
  header: number; // index of header row (-1 = none)
  date: number;
  desc: number;
  amount: number; // signed amount or with DB/CR text (-1 if using debit/credit)
  debit: number;
  credit: number;
  dbcr: number; // separate DB/CR indicator column
}

const has = (cell: string, re: RegExp) => re.test(cell.toLowerCase());

/** Guess the header row and which column is which. */
export function guessColumns(rows: string[][]): ColumnMap {
  const map: ColumnMap = { header: -1, date: -1, desc: -1, amount: -1, debit: -1, credit: -1, dbcr: -1 };
  for (let r = 0; r < Math.min(rows.length, 25); r += 1) {
    const row = rows[r];
    const dateCol = row.findIndex((c) => has(c, /^(tanggal|tgl|date|waktu|tanggal transaksi)/));
    if (dateCol === -1) continue;
    map.header = r;
    map.date = dateCol;
    map.desc = row.findIndex((c) => has(c, /(keterangan|deskripsi|description|uraian|detail|transaksi|remark|catatan)/) && !has(c, /tanggal/));
    map.debit = row.findIndex((c) => has(c, /^(debit|debet|keluar|uang keluar|mutasi keluar|withdrawal)/));
    map.credit = row.findIndex((c) => has(c, /^(kredit|credit|masuk|uang masuk|mutasi masuk|deposit)/));
    map.dbcr = row.findIndex((c) => has(c, /^(db\/cr|d\/k|dk|tipe|type|jenis)$/));
    map.amount = row.findIndex((c) => has(c, /^(jumlah|amount|nominal|mutasi|nilai)/));
    if (map.dbcr === -1 && map.amount >= 0) {
      // BCA puts an unnamed DB/CR column right after "Jumlah".
      const flags = rows
        .slice(r + 1, r + 30)
        .filter((x) => parseDate(x[dateCol] ?? ""))
        .map((x) => (x[map.amount + 1] ?? "").trim().toUpperCase())
        .filter(Boolean);
      if (flags.length && flags.every((f) => /^(DB|CR|D|K|C)$/.test(f))) map.dbcr = map.amount + 1;
    }
    return map;
  }
  // No header: guess from the first data-looking row.
  const row = rows.find((r) => r.some((c) => parseDate(c)));
  if (row) {
    map.date = row.findIndex((c) => !!parseDate(c));
    map.amount = row.findIndex((c, i) => i !== map.date && parseAmount(c) != null && /\d{3}/.test(c));
    map.desc = row.findIndex((c, i) => i !== map.date && i !== map.amount && /[a-z]{3}/i.test(c));
  }
  return map;
}

export interface ParsedRow {
  date: string;
  note: string;
  amount: number; // positive
  kind: "in" | "out";
}

export function extractRows(rows: string[][], map: ColumnMap, fallbackYear?: number): ParsedRow[] {
  const out: ParsedRow[] = [];
  for (let r = map.header + 1; r < rows.length; r += 1) {
    const row = rows[r];
    const date = map.date >= 0 ? parseDate(row[map.date] ?? "", fallbackYear) : null;
    if (!date) continue;
    let signed: number | null = null;
    if (map.debit >= 0 || map.credit >= 0) {
      const d = map.debit >= 0 ? parseAmount(row[map.debit] ?? "") : null;
      const c = map.credit >= 0 ? parseAmount(row[map.credit] ?? "") : null;
      if (d && Math.abs(d) > 0) signed = -Math.abs(d);
      else if (c && Math.abs(c) > 0) signed = Math.abs(c);
    } else if (map.amount >= 0) {
      signed = parseAmount(row[map.amount] ?? "");
      if (signed != null && map.dbcr >= 0) {
        const flag = (row[map.dbcr] ?? "").trim().toUpperCase();
        if (/^(DB|D|DEBIT|K|KELUAR)$/.test(flag)) signed = -Math.abs(signed);
        if (/^(CR|C|KREDIT|CREDIT|MASUK)$/.test(flag)) signed = Math.abs(signed);
      }
    }
    if (signed == null || signed === 0) continue;
    const note = (map.desc >= 0 ? row[map.desc] ?? "" : "").replace(/\s+/g, " ").trim().slice(0, 80);
    out.push({ date, note, amount: Math.round(Math.abs(signed)), kind: signed < 0 ? "out" : "in" });
  }
  return out;
}

const CAT_RULES: [RegExp, string][] = [
  [/(gofood|grabfood|shopeefood|resto|warung|makan|bakso|kfc|mcd|hokben|kopi|coffee|starbucks|janji jiwa|kenangan)/i, "Makan"],
  [/(spbu|pertamina|shell|bensin|bbm|vivo energy)/i, "Bensin"],
  [/(laundry|londri)/i, "Laundry"],
  [/(skincare|sociolla|watsons|guardian|beauty)/i, "Skincare"],
  [/(ukt|kampus|universitas|kuliah|spp)/i, "Kuliah"],
  [/(indomaret|alfamart|alfamidi|jajan|snack)/i, "Jajan"],
  [/(tabungan|deposito|investasi|bibit|reksa)/i, "Tabungan"],
];

export function guessCategory(note: string): string {
  for (const [re, c] of CAT_RULES) if (re.test(note)) return c;
  return "Lainnya";
}
