/**
 * Activity feed: emit lightweight items that show up on /pencapaian feed.
 * Stored as items kind="kudos-feed". Other partner can tap "Mantap! 🔥".
 */
import { upsertItem } from "@/stores/data";
import { todayISO } from "@/lib/utils";

export type FeedType =
  | "pomodoro"
  | "deposit"
  | "goal-complete"
  | "exercise"
  | "journal"
  | "habit"
  | "milestone"
  | "badge";

export interface FeedInput {
  who?: string;
  type: FeedType;
  text: string;
  amount?: number;
  meta?: Record<string, unknown>;
}

export async function emitFeed(userId: string, input: FeedInput): Promise<void> {
  if (!userId) return;
  await upsertItem(userId, {
    kind: "kudos-feed",
    title: input.text,
    date: todayISO(),
    who: input.who,
    amount: input.amount,
    payload: JSON.stringify({ type: input.type, ...(input.meta ?? {}) }),
  });
}
