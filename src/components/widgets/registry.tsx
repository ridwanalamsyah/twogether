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
    label: "Quick Add",
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
    description: "Ring progress per tujuan",
    emoji: "🎯",
    Component: SavingsProgressWidget,
  },
  "goal-prediction": {
    kind: "goal-prediction",
    label: "Prediksi Goal",
    description: "ETA berbasis tren setoran",
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
    description: "Air, mood, tidur — quick tap",
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
    description: "Progress BAB & bimbingan",
    emoji: "🎓",
    Component: SkripsiWidget,
  },
  streak: {
    kind: "streak",
    label: "Streak",
    description: "Konsistensi hari berturut-turut",
    emoji: "🔥",
    Component: StreakWidget,
  },
  pencapaian: {
    kind: "pencapaian",
    label: "Pencapaian",
    description: "Total badge yang sudah unlock",
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
    label: "Sehat — Cepat",
    description: "Air, mood, berat — input langsung",
    emoji: "💧",
    Component: SehatQuickWidget,
  },
  "keuangan-quick": {
    kind: "keuangan-quick",
    label: "Keuangan — Cepat",
    description: "Saldo bulan ini + catat pemasukan/pengeluaran",
    emoji: "💰",
    Component: KeuanganQuickWidget,
  },
  "habits-quick": {
    kind: "habits-quick",
    label: "Habits — Cepat",
    description: "Centang kebiasaan langsung dari home",
    emoji: "✅",
    Component: HabitsQuickWidget,
  },
  "hari-kita": {
    kind: "hari-kita",
    label: "Hari Kita",
    description: "Countup berapa lama bersama",
    emoji: "💞",
    Component: HariKitaWidget,
  },
  "pinned-message": {
    kind: "pinned-message",
    label: "Pesan Pinned",
    description: "Pesan singkat untuk pasangan",
    emoji: "📌",
    Component: PinnedMessageWidget,
  },
};
