"use client";

import type { WidgetKind } from "@/stores/dashboard";
import { BalanceWidget } from "./BalanceWidget";
import { ExpenseChartWidget } from "./ExpenseChartWidget";
import { SavingsProgressWidget } from "./SavingsProgressWidget";
import { ChecklistWidget } from "./ChecklistWidget";
import { GoalPredictionWidget } from "./GoalPredictionWidget";
import { TransactionsWidget } from "./TransactionsWidget";
import { MomentsWidget } from "./MomentsWidget";
import { QuickAddWidget } from "./QuickAddWidget";
import { SkripsiWidget } from "./SkripsiWidget";
import { StreakWidget } from "./StreakWidget";
import { PencapaianWidget } from "./PencapaianWidget";
import { JadwalHariIniWidget } from "./JadwalHariIniWidget";
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
};
