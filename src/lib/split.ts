import type { EntryRecord } from "@/lib/db";
import { parsePayload } from "@/lib/people";

export type SplitMode = "half" | "full" | "custom";
export interface SplitPayload {
  note: string;
  mode: SplitMode;
  /** How much the non-payer owes for this bill. */
  owe: number;
}

/** Positive = partner owes me; negative = I owe partner. */
export function splitBalance(entries: EntryRecord[], me: string): number {
  let net = 0;
  for (const e of entries) {
    const mine = (e.who || me) === me;
    if (e.kind === "split") {
      const owe = parsePayload<SplitPayload>(e.payload, { note: "", mode: "half", owe: 0 }).owe;
      net += mine ? owe : -owe;
    } else if (e.kind === "split-settle") {
      net += mine ? (e.valueNum ?? 0) : -(e.valueNum ?? 0);
    }
  }
  return Math.round(net);
}

