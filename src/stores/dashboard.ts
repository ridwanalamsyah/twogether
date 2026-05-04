"use client";

import { create } from "zustand";
import { getDB, newId, now } from "@/lib/db";
import { sync } from "@/services/sync";

/**
 * Dashboard widget configuration.
 *
 * The Notion-style approach: every UI block on Home is a "widget" with:
 *  - id        : stable widget instance id
 *  - kind      : registered widget type (see WIDGET_REGISTRY in components)
 *  - size      : "sm" | "md" | "lg" — drives grid column span
 *  - enabled   : visibility toggle (so users can hide without deleting)
 *  - props     : optional widget-specific config (e.g. category filter)
 *
 * Layout is persisted per-user via the `dashboards` IndexedDB table; the
 * sync queue propagates the JSON to the server when online.
 */

export type WidgetSize = "sm" | "md" | "lg";
export type WidgetKind =
  | "balance"
  | "expense-chart"
  | "savings-progress"
  | "checklist"
  | "skripsi"
  | "moments"
  | "transactions"
  | "goal-prediction"
  | "quick-add"
  | "streak";

export interface WidgetConfig {
  id: string;
  kind: WidgetKind;
  size: WidgetSize;
  enabled: boolean;
  props?: Record<string, unknown>;
}

export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: "w_balance", kind: "balance", size: "lg", enabled: true },
  { id: "w_quick", kind: "quick-add", size: "lg", enabled: true },
  { id: "w_expense", kind: "expense-chart", size: "lg", enabled: true },
  { id: "w_savings", kind: "savings-progress", size: "lg", enabled: true },
  { id: "w_prediction", kind: "goal-prediction", size: "lg", enabled: true },
  { id: "w_checklist", kind: "checklist", size: "md", enabled: true },
  { id: "w_moments", kind: "moments", size: "md", enabled: true },
  { id: "w_transactions", kind: "transactions", size: "lg", enabled: true },
  { id: "w_skripsi", kind: "skripsi", size: "md", enabled: true },
  { id: "w_streak", kind: "streak", size: "sm", enabled: true },
];

interface DashboardState {
  layout: WidgetConfig[];
  loaded: boolean;
  load: (userId: string) => Promise<void>;
  save: (userId: string) => Promise<void>;
  reorder: (fromIndex: number, toIndex: number) => void;
  toggle: (id: string) => void;
  resize: (id: string, size: WidgetSize) => void;
  addWidget: (kind: WidgetKind, size?: WidgetSize) => void;
  removeWidget: (id: string) => void;
  resetDefault: () => void;
}

export const useDashboard = create<DashboardState>((set, get) => ({
  layout: DEFAULT_LAYOUT,
  loaded: false,

  load: async (userId) => {
    if (typeof window === "undefined") return;
    const db = getDB();
    const stored = await db.dashboards.where("userId").equals(userId).first();
    if (stored) {
      try {
        const parsed = JSON.parse(stored.layout) as WidgetConfig[];
        // Merge in any new default widgets the user hasn't seen yet —
        // keeps existing user customization while adding new features.
        const ids = new Set(parsed.map((w) => w.id));
        const merged = [
          ...parsed,
          ...DEFAULT_LAYOUT.filter((w) => !ids.has(w.id)).map((w) => ({
            ...w,
            enabled: false,
          })),
        ];
        set({ layout: merged, loaded: true });
        return;
      } catch {
        // Corrupt layout — fall through to default.
      }
    }
    set({ layout: DEFAULT_LAYOUT, loaded: true });
  },

  save: async (userId) => {
    const db = getDB();
    const existing = await db.dashboards.where("userId").equals(userId).first();
    const id = existing?.id ?? newId();
    const record = {
      id,
      userId,
      layout: JSON.stringify(get().layout),
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
      dirty: 1 as const,
    };
    await sync.recordWrite("dashboards", record);
  },

  reorder: (from, to) =>
    set((s) => {
      const next = [...s.layout];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { layout: next };
    }),

  toggle: (id) =>
    set((s) => ({
      layout: s.layout.map((w) =>
        w.id === id ? { ...w, enabled: !w.enabled } : w,
      ),
    })),

  resize: (id, size) =>
    set((s) => ({
      layout: s.layout.map((w) => (w.id === id ? { ...w, size } : w)),
    })),

  addWidget: (kind, size = "lg") =>
    set((s) => ({
      layout: [
        ...s.layout,
        { id: `w_${newId()}`, kind, size, enabled: true },
      ],
    })),

  removeWidget: (id) =>
    set((s) => ({ layout: s.layout.filter((w) => w.id !== id) })),

  resetDefault: () => set({ layout: DEFAULT_LAYOUT }),
}));
