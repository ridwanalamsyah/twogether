"use client";

import type { WidgetKind } from "@/stores/dashboard";
import { BalanceWidget } from "./BalanceWidget";
import { ExpenseChartWidget } from "./ExpenseChartWidget";
import { SavingsProgressWidget } from "./SavingsProgressWidget";
import { ChecklistWidget } from "./ChecklistWidget";
import { GoalPredictionWidget } from "./GoalPredictionWidget";
import { TransactionsWidget } from "./TransactionsWidget";
import { MomentsWidget } from "./MomentsWidget";
import { HariIniWidget } from "./HariIniWidget";
import { QuickAddWidget } from "./QuickAddWidget";
import { SkripsiWidget } from "./SkripsiWidget";
import { StreakWidget } from "./StreakWidget";
import { PencapaianWidget } from "./PencapaianWidget";
import { JadwalHariIniWidget } from "./JadwalHariIniWidget";
import { SehatQuickWidget } from "./SehatQuickWidget";
import { KeuanganQuickWidget } from "./KeuanganQuickWidget";
import { HabitsQuickWidget } from "./HabitsQuickWidget";
import { HariKitaWidget } from "./HariKitaWidget";
import { PinnedMessageWidget } from "./PinnedMessageWidget";
import { PlaceholderWidget } from "./PlaceholderWidget";
import { PatunganWidget, ShalatWidget, SiklusWidget } from "./CoupleWidgets";
import { KabarWidget } from "@/components/kabar/Kabar";
import { FokusWidget, RamadhanWidget, TantanganWidget } from "./SpaceWidgets";
import { MonthEndWidget } from "./MonthEndWidget";
import { RemindersWidget } from "@/components/reminders/Reminders";

export interface WidgetMeta {
  kind: WidgetKind;
  label: string;
  description: string;
  emoji: string;
  Component: React.ComponentType;
}

export const WIDGET_REGISTRY: Record<WidgetKind, WidgetMeta> = {
  balance: {
    kind: "balance",
    label: "Saldo",
    description: "Sisa per anggota & total tabungan",
    emoji: "💰",
    Component: BalanceWidget,
  },
  "quick-add": {
    kind: "quick-add",
    label: "Catat Cepat",
    description: "Tambah transaksi cepat",
    emoji: "⚡️",
    Component: QuickAddWidget,
  },
  "expense-chart": {
    kind: "expense-chart",
    label: "Grafik Pengeluaran",
    description: "Pengeluaran 7 hari terakhir",
    emoji: "📊",
    Component: ExpenseChartWidget,
  },
  "savings-progress": {
    kind: "savings-progress",
    label: "Progress Tabungan",
    description: "Seberapa dekat tiap tabungan ke target",
    emoji: "🎯",
    Component: SavingsProgressWidget,
  },
  "goal-prediction": {
    kind: "goal-prediction",
    label: "Prediksi Goal",
    description: "Kira-kira kapan target tercapai",
    emoji: "🔮",
    Component: GoalPredictionWidget,
  },
  checklist: {
    kind: "checklist",
    label: "Checklist Hari Ini",
    description: "Tugas harian",
    emoji: "✅",
    Component: ChecklistWidget,
  },
  moments: {
    kind: "moments",
    label: "Moments",
    description: "Catatan & momen terbaru",
    emoji: "💌",
    Component: MomentsWidget,
  },
  "hari-ini": {
    kind: "hari-ini",
    label: "Hari Ini",
    description: "Air, mood, tidur — sekali tap",
    emoji: "🌤️",
    Component: HariIniWidget,
  },
  transactions: {
    kind: "transactions",
    label: "Transaksi Terbaru",
    description: "5 transaksi terakhir",
    emoji: "🧾",
    Component: TransactionsWidget,
  },
  skripsi: {
    kind: "skripsi",
    label: "Skripsi",
    description: "Kemajuan bab & bimbingan",
    emoji: "🎓",
    Component: SkripsiWidget,
  },
  streak: {
    kind: "streak",
    label: "Hari beruntun",
    description: "Konsistensi hari berturut-turut",
    emoji: "🔥",
    Component: StreakWidget,
  },
  pencapaian: {
    kind: "pencapaian",
    label: "Pencapaian",
    description: "Lencana yang sudah didapat",
    emoji: "🏆",
    Component: PencapaianWidget,
  },
  "jadwal-hari-ini": {
    kind: "jadwal-hari-ini",
    label: "Jadwal Hari Ini",
    description: "Kuliah Semester 6 hari ini",
    emoji: "📚",
    Component: JadwalHariIniWidget,
  },
  "sehat-quick": {
    kind: "sehat-quick",
    label: "Sehat",
    description: "Catat air, mood, berat langsung",
    emoji: "💧",
    Component: SehatQuickWidget,
  },
  "keuangan-quick": {
    kind: "keuangan-quick",
    label: "Catat Uang",
    description: "Saldo bulan ini + catat pemasukan/pengeluaran",
    emoji: "💰",
    Component: KeuanganQuickWidget,
  },
  "habits-quick": {
    kind: "habits-quick",
    label: "Kebiasaan",
    description: "Centang kebiasaan langsung dari Beranda",
    emoji: "✅",
    Component: HabitsQuickWidget,
  },
  "hari-kita": {
    kind: "hari-kita",
    label: "Hari Kita",
    description: "Sudah berapa lama kalian bersama",
    emoji: "💞",
    Component: HariKitaWidget,
  },
  "pinned-message": {
    kind: "pinned-message",
    label: "Pesan untuk Pasangan",
    description: "Pesan singkat untuk pasangan",
    emoji: "📌",
    Component: PinnedMessageWidget,
  },
  shalat: {
    kind: "shalat",
    label: "Shalat berikutnya",
    description: "Jadwal terdekat & centang hari ini",
    emoji: "🕌",
    Component: ShalatWidget,
  },
  siklus: {
    kind: "siklus",
    label: "Siklus",
    description: "Fase & perkiraan haid",
    emoji: "🌸",
    Component: SiklusWidget,
  },
  kabar: {
    kind: "kabar",
    label: "Kabar kita",
    description: "Status pasangan & kirim kangen",
    emoji: "💗",
    Component: KabarWidget,
  },
  patungan: {
    kind: "patungan",
    label: "Patungan",
    description: "Siapa perlu ganti siapa",
    emoji: "🤝",
    Component: PatunganWidget,
  },
  tantangan: {
    kind: "tantangan",
    label: "Tantangan hari ini",
    description: "Centang tantangan berdua langsung dari Beranda",
    emoji: "🔥",
    Component: TantanganWidget,
  },
  fokus: {
    kind: "fokus",
    label: "Fokus bareng",
    description: "Lihat kalau pasangan lagi fokus, lalu ikut",
    emoji: "🎧",
    Component: FokusWidget,
  },
  pengingat: {
    kind: "pengingat",
    label: "Pengingat",
    description: "Tagihan, tanggal penting, dan yang belum dicatat hari ini",
    emoji: "🔔",
    Component: RemindersWidget,
  },
  "sisa-bulan": {
    kind: "sisa-bulan",
    label: "Sisa bulan lalu",
    description: "Awal bulan: tawaran menabung sisa uang bulan lalu",
    emoji: "🐖",
    Component: MonthEndWidget,
  },
  ramadhan: {
    kind: "ramadhan",
    label: "Ramadhan",
    description: "Hitung mundur imsak & buka puasa",
    emoji: "🏮",
    Component: RamadhanWidget,
  },
};
