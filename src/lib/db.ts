import Dexie, { type Table } from "dexie";

/**
 * Local-first IndexedDB schema (Dexie).
 *
 * Every domain table includes:
 *  - `id`           : ULID-style string PK so client can mint IDs offline
 *  - `userId`       : owning user (multi-account support)
 *  - `updatedAt`    : ms timestamp, used for last-write-wins conflict resolution
 *  - `dirty`        : 1 = pending sync to server, 0 = clean
 *  - `deletedAt?`   : soft-delete marker so deletions can sync without races
 *
 * The `outbox` table is the durable sync queue: every mutation enqueues a
 * SyncOp here and a background worker drains it when online.
 */

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface BaseRecord {
  id: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  /** 1 = needs sync, 0 = clean. Indexed flag (Dexie won't index booleans). */
  dirty: 0 | 1;
  deletedAt?: number;
}

export interface UserRecord extends BaseRecord {
  email: string;
  name: string;
  birthday?: string;
  /** data: URL (base64) — compressed to ~20 KB before storage. */
  avatar?: string;
  /** Salt for deriving local-encryption keys from the user's password. */
  encSalt?: string;
}

export interface TransactionRecord extends BaseRecord {
  /** "in" = income/savings deposit, "out" = expense */
  kind: "in" | "out";
  amount: number;
  category: string;
  who: string;
  note?: string;
  /** ISO date YYYY-MM-DD for grouping & charts. */
  date: string;
  /** Free-form tags for filtering across modules. */
  tags?: string[];
}

export interface GoalRecord extends BaseRecord {
  name: string;
  target: number;
  category: "savings" | "modal" | "travel" | "custom";
  deadline?: string;
  emoji?: string;
  /**
   * Optional milestone percentages (e.g. [25, 50, 75, 100]) — used to render
   * progress badges and trigger little celebrations as the goal grows.
   */
  milestones?: number[];
}

export interface DepositRecord extends BaseRecord {
  goalId: string;
  amount: number;
  who: string;
  note?: string;
  date: string;
}

export interface ChecklistRecord extends BaseRecord {
  title: string;
  done: 0 | 1;
  date: string;
}

export interface MomentRecord extends BaseRecord {
  title: string;
  body: string;
  /** Ciphertext (base64) when end-to-end encrypted. */
  cipher?: string;
  encrypted: 0 | 1;
  date: string;
  emoji?: string;
  tags?: string[];
  /** Optional voice recording (audio data URL). */
  voice?: string;
}

export interface DashboardLayoutRecord extends BaseRecord {
  /** JSON serialized array of WidgetConfig (see stores/dashboard.ts). */
  layout: string;
}

/**
 * A single chapter of the user's skripsi (thesis). Progress is tracked both
 * via a 0–100 percent slider and a free-text status so the user can write
 * whatever makes sense to them (e.g. "revisi dosen pembimbing").
 */
export interface SkripsiChapterRecord extends BaseRecord {
  /** Roman-numeral chapter number shown in UI (I, II, III, IV, V, …). */
  number: string;
  title: string;
  subtitle?: string;
  progress: number;
  status: string;
  note?: string;
  /** Sort order (0-based). */
  order: number;
}

/**
 * A consultation / bimbingan session — meeting notes, action items.
 */
export interface SkripsiBimbinganRecord extends BaseRecord {
  date: string;
  dosen?: string;
  topic: string;
  notes?: string;
  /** Follow-ups to do before next meeting. */
  todo?: string;
  done: 0 | 1;
}

/**
 * A deadline attached to a chapter / bimbingan / task.
 */
export interface DeadlineRecord extends BaseRecord {
  title: string;
  date: string;
  category: "skripsi" | "kuliah" | "konten" | "lain";
  detail?: string;
  done: 0 | 1;
}

/**
 * Skripsi meta (one per workspace): title, advisor, target sidang date.
 */
export interface SkripsiMetaRecord extends BaseRecord {
  judul: string;
  dosen: string;
  target: string;
}

export interface KontenRecord extends BaseRecord {
  title: string;
  /** ide / draft / scheduled / posted */
  status: "ide" | "draft" | "scheduled" | "posted";
  platform?: string;
  scheduledAt?: string;
  note?: string;
}

export interface HabitRecord extends BaseRecord {
  label: string;
  /** Time bucket for display: Pagi, Siang, Sore, Malam, Seharian. */
  bucket: string;
  /** Assigned to a workspace member (name); empty = everyone. */
  who?: string;
}

export interface HabitLogRecord extends BaseRecord {
  habitId: string;
  date: string;
  who: string;
  done: 0 | 1;
}

export interface ReflectionRecord extends BaseRecord {
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  highlights: string;
  who?: string;
}

export interface PreferenceRecord extends BaseRecord {
  /** "theme" | "accent" | "privacy" | ... */
  key: string;
  value: string;
}

/**
 * Recurring transaction template. Every `applyRecurring` tick (or on app
 * open) the engine checks each template and inserts the matching
 * TransactionRecord if its next-due date has arrived.
 */
export interface RecurringRecord extends BaseRecord {
  kind: "in" | "out";
  amount: number;
  category: string;
  who: string;
  note?: string;
  /** daily | weekly | monthly */
  interval: "daily" | "weekly" | "monthly";
  /** Day-of-month for monthly (1–28). Ignored for other intervals. */
  dayOfMonth?: number;
  /** Next scheduled ISO date (YYYY-MM-DD) to trigger. */
  nextDue: string;
  active: 0 | 1;
}

/**
 * Monthly spending budget per category. Alerts when the current-month
 * sum passes the limit.
 */
export interface BudgetRecord extends BaseRecord {
  category: string;
  limit: number;
  who?: string;
}

/**
 * Travel mode: a planned trip with a daily budget. Spending logged during
 * the date range is attributed to the trip (via tag) and the page shows
 * remaining budget vs. days left.
 */
export interface TripRecord extends BaseRecord {
  destination: string;
  emoji?: string;
  startDate: string;
  endDate: string;
  budget: number;
  /** Generated tag like `trip:bali24` so transactions can be linked. */
  tag: string;
  note?: string;
  packing?: string;
}

/**
 * A goal that auto-creates a deposit on a recurring schedule. Useful for
 * "tabung 1jt tiap bulan" style commitments.
 */
export interface RecurringGoalRecord extends BaseRecord {
  goalId: string;
  amount: number;
  who: string;
  /** Day of the month to auto-deposit (1–28). */
  dayOfMonth: number;
  nextDue: string;
  active: 0 | 1;
}

/**
 * Generic dated entry — used for water/weight/mood/sleep/exercise/journal/
 * dream/donation/pomodoro/appreciation/argument/surprise/qotd-response/
 * skincare-log/ootd-log/cycle-day. Each entry has a `kind` discriminator
 * and a freeform `payload` JSON string for kind-specific fields.
 */
export interface EntryRecord extends BaseRecord {
  kind: string;
  date: string;
  valueNum?: number;
  valueText?: string;
  who?: string;
  tags?: string[];
  /** JSON-serialized kind-specific fields. */
  payload?: string;
}

/**
 * Generic catalog item — used for anniversaries / date-night ideas /
 * bucket-list / meds / pets / shopping / pantry / cleaning-tasks /
 * meal-plan / maintenance / wishlist / gift-ideas / media (book/movie/
 * podcast) / outfits / skincare-products / resolutions / reading-books /
 * courses / subscriptions. Long-lived rows.
 */
export interface ItemRecord extends BaseRecord {
  kind: string;
  title: string;
  status?: string;
  date?: string;
  due?: string;
  amount?: number;
  who?: string;
  tags?: string[];
  /** JSON-serialized kind-specific fields. */
  payload?: string;
}

export type SyncOpKind = "upsert" | "delete";

export interface SyncOp {
  /** Auto-incremented local sequence; first-in first-out drain. */
  seq?: number;
  table: string;
  recordId: string;
  op: SyncOpKind;
  /** Snapshot of the record at enqueue time; used as the request body. */
  payload: string;
  enqueuedAt: number;
  attempts: number;
  lastError?: string;
}

class BarengDB extends Dexie {
  users!: Table<UserRecord, string>;
  transactions!: Table<TransactionRecord, string>;
  goals!: Table<GoalRecord, string>;
  deposits!: Table<DepositRecord, string>;
  checklists!: Table<ChecklistRecord, string>;
  moments!: Table<MomentRecord, string>;
  dashboards!: Table<DashboardLayoutRecord, string>;
  preferences!: Table<PreferenceRecord, string>;
  skripsiChapters!: Table<SkripsiChapterRecord, string>;
  skripsiBimbingan!: Table<SkripsiBimbinganRecord, string>;
  skripsiMeta!: Table<SkripsiMetaRecord, string>;
  deadlines!: Table<DeadlineRecord, string>;
  konten!: Table<KontenRecord, string>;
  habits!: Table<HabitRecord, string>;
  habitLogs!: Table<HabitLogRecord, string>;
  reflections!: Table<ReflectionRecord, string>;
  recurring!: Table<RecurringRecord, string>;
  budgets!: Table<BudgetRecord, string>;
  trips!: Table<TripRecord, string>;
  recurringGoals!: Table<RecurringGoalRecord, string>;
  entries!: Table<EntryRecord, string>;
  items!: Table<ItemRecord, string>;
  outbox!: Table<SyncOp, number>;

  constructor() {
    super("bareng");

    this.version(1).stores({
      users: "id, email, updatedAt, dirty",
      transactions: "id, userId, date, kind, category, updatedAt, dirty, deletedAt",
      goals: "id, userId, category, updatedAt, dirty, deletedAt",
      deposits: "id, userId, goalId, date, updatedAt, dirty, deletedAt",
      checklists: "id, userId, date, done, updatedAt, dirty, deletedAt",
      moments: "id, userId, date, updatedAt, dirty, deletedAt",
      dashboards: "id, userId, updatedAt, dirty",
      preferences: "id, [userId+key], updatedAt, dirty",
      outbox: "++seq, table, recordId, enqueuedAt",
    });

    this.version(2).stores({
      skripsiChapters: "id, userId, order, updatedAt, dirty, deletedAt",
      skripsiBimbingan: "id, userId, date, updatedAt, dirty, deletedAt",
      skripsiMeta: "id, userId, updatedAt, dirty",
      deadlines: "id, userId, date, category, done, updatedAt, dirty, deletedAt",
      konten: "id, userId, status, scheduledAt, updatedAt, dirty, deletedAt",
      habits: "id, userId, bucket, updatedAt, dirty, deletedAt",
      habitLogs: "id, userId, date, habitId, who, updatedAt, dirty, deletedAt",
      reflections: "id, userId, date, who, updatedAt, dirty, deletedAt",
    });

    this.version(3).stores({
      recurring: "id, userId, nextDue, active, updatedAt, dirty, deletedAt",
      budgets: "id, userId, category, updatedAt, dirty, deletedAt",
    });

    this.version(4).stores({
      trips: "id, userId, startDate, endDate, updatedAt, dirty, deletedAt",
      recurringGoals: "id, userId, goalId, nextDue, active, updatedAt, dirty, deletedAt",
    });

    this.version(5).stores({
      entries: "id, userId, kind, date, [userId+kind], updatedAt, dirty, deletedAt",
      items: "id, userId, kind, status, due, [userId+kind], updatedAt, dirty, deletedAt",
    });
  }
}

/** Cached singleton — avoid creating multiple Dexie instances under HMR. */
let _db: BarengDB | null = null;

export function getDB(): BarengDB {
  if (typeof window === "undefined") {
    throw new Error("getDB() must be called in the browser");
  }
  if (!_db) _db = new BarengDB();
  return _db;
}

/** Generates a sortable ULID-ish ID without pulling another dep. */
export function newId(): string {
  const time = Date.now().toString(36).padStart(9, "0");
  const rand = Math.random().toString(36).slice(2, 12).padStart(10, "0");
  return `${time}${rand}`;
}

export function now(): number {
  return Date.now();
}
