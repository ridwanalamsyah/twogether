"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** Returns the singleton Supabase client, or null if env vars missing. */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!URL || !KEY) return null;
  if (!client) {
    client = createClient(URL, KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "bareng:sb-auth",
      },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return client;
}

export function hasSupabase(): boolean {
  return Boolean(URL && KEY);
}

/** Maps local Dexie table name to Supabase table name (snake_case). */
export const TABLE_MAP: Record<string, string> = {
  transactions: "transactions",
  goals: "goals",
  deposits: "deposits",
  checklists: "checklists",
  moments: "moments",
  dashboards: "dashboards",
  preferences: "preferences",
  skripsiChapters: "skripsi_chapters",
  skripsiBimbingan: "skripsi_bimbingan",
  skripsiMeta: "skripsi_meta",
  deadlines: "deadlines",
  konten: "konten",
  habits: "habits",
  habitLogs: "habit_logs",
  reflections: "reflections",
  recurring: "recurring",
  budgets: "budgets",
  trips: "trips",
  recurringGoals: "recurring_goals",
  entries: "entries",
  items: "items",
};

/** Inverse: Supabase → Dexie. */
export const TABLE_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(TABLE_MAP).map(([k, v]) => [v, k]),
);

/**
 * Convert a local Dexie record into the Supabase row shape:
 *  - drop `dirty` (server-side concept doesn't exist)
 *  - inject `workspace_id` and `user_id` (auth.uid)
 *  - convert ms-timestamps to ISO for created_at/updated_at/deleted_at
 *  - convert camelCase columns to snake_case for skripsi_chapters etc.
 */
export function toRow(
  table: string,
  record: Record<string, unknown>,
  workspaceId: string,
  userId: string,
): Record<string, unknown> {
  // Strip local-only fields
  const { dirty: _dirty, userId: _localUserId, ...rest } = record as {
    dirty?: number;
    userId?: string;
  } & Record<string, unknown>;

  const row: Record<string, unknown> = { ...rest };
  row.workspace_id = workspaceId;
  row.user_id = userId;

  // ms -> ISO
  if (typeof row.createdAt === "number")
    row.created_at = new Date(row.createdAt as number).toISOString();
  if (typeof row.updatedAt === "number")
    row.updated_at = new Date(row.updatedAt as number).toISOString();
  if (typeof row.deletedAt === "number")
    row.deleted_at = new Date(row.deletedAt as number).toISOString();
  delete row.createdAt;
  delete row.updatedAt;
  delete row.deletedAt;

  // camelCase → snake_case for known fields
  const renames: Record<string, string> = {
    goalId: "goal_id",
    habitId: "habit_id",
    dayOfMonth: "day_of_month",
    nextDue: "next_due",
    startDate: "start_date",
    endDate: "end_date",
    scheduledAt: "scheduled_at",
    valueNum: "value_num",
    valueText: "value_text",
    passwordHash: "_drop", // never push hashes
  };
  for (const [from, to] of Object.entries(renames)) {
    if (from in row) {
      if (to !== "_drop") row[to] = row[from];
      delete row[from];
    }
  }

  // dashboards: layout is stored as JSON string locally; Supabase column is jsonb
  if (table === "dashboards" && typeof row.layout === "string") {
    try {
      row.layout = JSON.parse(row.layout as string);
    } catch {
      // leave as-is
    }
  }

  return row;
}

/**
 * Convert a Supabase row back into the local Dexie record shape.
 */
export function fromRow(
  table: string,
  row: Record<string, unknown>,
  localUserId: string,
): Record<string, unknown> {
  const rec: Record<string, unknown> = { ...row };
  // userId in local DB == local user id
  rec.userId = localUserId;

  // ISO → ms
  if (typeof rec.created_at === "string")
    rec.createdAt = new Date(rec.created_at as string).getTime();
  if (typeof rec.updated_at === "string")
    rec.updatedAt = new Date(rec.updated_at as string).getTime();
  if (typeof rec.deleted_at === "string")
    rec.deletedAt = new Date(rec.deleted_at as string).getTime();
  delete rec.created_at;
  delete rec.updated_at;
  delete rec.deleted_at;

  // snake -> camel
  const renames: Record<string, string> = {
    goal_id: "goalId",
    habit_id: "habitId",
    day_of_month: "dayOfMonth",
    next_due: "nextDue",
    start_date: "startDate",
    end_date: "endDate",
    scheduled_at: "scheduledAt",
    value_num: "valueNum",
    value_text: "valueText",
    workspace_id: "_workspaceId",
    user_id: "_remoteUserId",
  };
  for (const [from, to] of Object.entries(renames)) {
    if (from in rec) {
      if (to.startsWith("_")) {
        delete rec[from];
      } else {
        rec[to] = rec[from];
        delete rec[from];
      }
    }
  }

  // dashboards: layout from jsonb → string for Dexie
  if (table === "dashboards" && typeof rec.layout === "object") {
    rec.layout = JSON.stringify(rec.layout);
  }

  rec.dirty = 0;
  return rec;
}
