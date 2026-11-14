"use client";

import type { WidgetKind } from "@/stores/dashboard";
import { spaceIcon, type IconSpec } from "@/lib/icons";
import {
  BarChart3,
  CheckSquare,
  Clock,
  Flame,
  Heart,
  HeartHandshake,
  MessageCircleHeart,
  MessageSquareText,
  Moon,
  PenLine,
  Pin,
  PiggyBank,
  PlusCircle,
  Receipt,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  Bell,
} from "lucide-react";
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
import { DailyQuestionWidget } from "./DailyQuestionWidget";
import { LdrWidget } from "./LdrWidget";
import { FokusWidget, RamadhanWidget, TantanganWidget } from "./SpaceWidgets";
import { MonthEndWidget } from "./MonthEndWidget";
import { RemindersWidget } from "@/components/reminders/Reminders";

export interface WidgetMeta {
  kind: WidgetKind;
  label: string;
  description: string;
  icon: IconSpec;
  Component: React.ComponentType;
}

export const WIDGET_REGISTRY: Record<WidgetKind, WidgetMeta> = {
  balance: {
    kind: "balance",
    label: "Saldo",
    description: "Sisa per anggota & total tabungan",
    icon: { Icon: Wallet, tint: "var(--tint-green)" },
    Component: BalanceWidget,
  },
  "quick-add": {
    kind: "quick-add",
    label: "Catat Cepat",
    description: "Tambah transaksi cepat",
    icon: { Icon: PenLine, tint: "var(--tint-amber)" },
    Component: QuickAddWidget,
  },
  "expense-chart": {
    kind: "expense-chart",
    label: "Grafik Pengeluaran",
    description: "Pengeluaran 7 hari terakhir",
    icon: { Icon: BarChart3, tint: "var(--tint-blue)" },
    Component: ExpenseChartWidget,
  },
  "savings-progress": {
    kind: "savings-progress",
    label: "Progress Tabungan",
    description: "Seberapa dekat tiap tabungan ke target",
    icon: { Icon: Target, tint: "var(--tint-emerald)" },
    Component: SavingsProgressWidget,
  },
  "goal-prediction": {
    kind: "goal-prediction",
    label: "Prediksi Goal",
    description: "Kira-kira kapan target tercapai",
    icon: { Icon: TrendingUp, tint: "var(--tint-iris)" },
    Component: GoalPredictionWidget,
  },
  checklist: {
    kind: "checklist",
    label: "Checklist Hari Ini",
    description: "Tugas harian",
    icon: { Icon: CheckSquare, tint: "var(--tint-green)" },
    Component: ChecklistWidget,
  },
  moments: {
    kind: "moments",
    label: "Moments",
    description: "Catatan & momen terbaru",
    icon: spaceIcon("/moments"),
    Component: MomentsWidget,
  },
  "hari-ini": {
    kind: "hari-ini",
    label: "Hari Ini",
    description: "Air, mood, tidur, sekali tap",
    icon: { Icon: Sun, tint: "var(--tint-orange)" },
    Component: HariIniWidget,
  },
  transactions: {
    kind: "transactions",
    label: "Transaksi Terbaru",
    description: "5 transaksi terakhir",
    icon: { Icon: Receipt, tint: "var(--tint-stone)" },
    Component: TransactionsWidget,
  },
  skripsi: {
    kind: "skripsi",
    label: "Skripsi",
    description: "Kemajuan bab & bimbingan",
    icon: spaceIcon("/skripsi"),
    Component: SkripsiWidget,
  },
  streak: {
    kind: "streak",
    label: "Hari beruntun",
    description: "Konsistensi hari berturut-turut",
    icon: { Icon: Flame, tint: "var(--tint-orange)" },
    Component: StreakWidget,
  },
  pencapaian: {
    kind: "pencapaian",
    label: "Pencapaian",
    description: "Lencana yang sudah didapat",
    icon: { Icon: Trophy, tint: "var(--tint-ochre)" },
    Component: PencapaianWidget,
  },
  "jadwal-hari-ini": {
    kind: "jadwal-hari-ini",
    label: "Jadwal Hari Ini",
    description: "Kuliah Semester 6 hari ini",
    icon: spaceIcon("/jadwal"),
    Component: JadwalHariIniWidget,
  },
  "sehat-quick": {
    kind: "sehat-quick",
    label: "Sehat",
    description: "Catat air, mood, berat langsung",
    icon: spaceIcon("/sehat"),
    Component: SehatQuickWidget,
  },
  "keuangan-quick": {
    kind: "keuangan-quick",
    label: "Catat Uang",
    description: "Saldo bulan ini + catat pemasukan/pengeluaran",
    icon: { Icon: PlusCircle, tint: "var(--tint-amber)" },
    Component: KeuanganQuickWidget,
  },
  "habits-quick": {
    kind: "habits-quick",
    label: "Kebiasaan",
    description: "Centang kebiasaan langsung dari Beranda",
    icon: spaceIcon("/habits"),
    Component: HabitsQuickWidget,
  },
  "hari-kita": {
    kind: "hari-kita",
    label: "Hari Kita",
    description: "Sudah berapa lama kalian bersama",
    icon: { Icon: Heart, tint: "var(--tint-rose)" },
    Component: HariKitaWidget,
  },
  "pinned-message": {
    kind: "pinned-message",
    label: "Pesan untuk Pasangan",
    description: "Pesan singkat untuk pasangan",
    icon: { Icon: Pin, tint: "var(--tint-ochre)" },
    Component: PinnedMessageWidget,
  },
  shalat: {
    kind: "shalat",
    label: "Shalat berikutnya",
    description: "Jadwal terdekat & centang hari ini",
    icon: spaceIcon("/shalat"),
    Component: ShalatWidget,
  },
  siklus: {
    kind: "siklus",
    label: "Siklus",
    description: "Fase & perkiraan haid",
    icon: spaceIcon("/siklus"),
    Component: SiklusWidget,
  },
  tanya: {
    kind: "tanya",
    label: "Pertanyaan hari ini",
    description: "Satu pertanyaan sehari, dijawab berdua",
    icon: { Icon: MessageSquareText, tint: "var(--tint-pink)" },
    Component: DailyQuestionWidget,
  },
  ldr: {
    kind: "ldr",
    label: "LDR",
    description: "Jam di tempat pasangan & hitung mundur ketemu",
    icon: { Icon: Clock, tint: "var(--tint-sky)" },
    Component: LdrWidget,
  },
  kabar: {
    kind: "kabar",
    label: "Kabar kita",
    description: "Status pasangan & kirim kangen",
    icon: { Icon: MessageCircleHeart, tint: "var(--tint-rose)" },
    Component: KabarWidget,
  },
  patungan: {
    kind: "patungan",
    label: "Patungan",
    description: "Siapa perlu ganti siapa",
    icon: { Icon: HeartHandshake, tint: "var(--tint-amber)" },
    Component: PatunganWidget,
  },
  tantangan: {
    kind: "tantangan",
    label: "Tantangan hari ini",
    description: "Centang tantangan berdua langsung dari Beranda",
    icon: spaceIcon("/tantangan"),
    Component: TantanganWidget,
  },
  fokus: {
    kind: "fokus",
    label: "Fokus bareng",
    description: "Lihat kalau pasangan lagi fokus, lalu ikut",
    icon: spaceIcon("/fokus"),
    Component: FokusWidget,
  },
  pengingat: {
    kind: "pengingat",
    label: "Pengingat",
    description: "Tagihan, tanggal penting, dan yang belum dicatat hari ini",
    icon: { Icon: Bell, tint: "var(--tint-orange)" },
    Component: RemindersWidget,
  },
  "sisa-bulan": {
    kind: "sisa-bulan",
    label: "Sisa bulan lalu",
    description: "Awal bulan: tawaran menabung sisa uang bulan lalu",
    icon: { Icon: PiggyBank, tint: "var(--tint-emerald)" },
    Component: MonthEndWidget,
  },
  ramadhan: {
    kind: "ramadhan",
    label: "Ramadhan",
    description: "Hitung mundur imsak & buka puasa",
    icon: { Icon: Moon, tint: "var(--tint-pine)" },
    Component: RamadhanWidget,
  },
};
