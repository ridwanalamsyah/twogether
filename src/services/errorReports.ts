"use client";

import { getSupabase } from "@/lib/supabase";
import { usePrivacy } from "@/stores/privacy";

/**
 * Anonymous crash reports, only when switched on in Pengaturan. Sends the
 * error text, a trimmed stack, the page path (no query string) and the
 * browser name — never ids, emails or what was being typed. Table and rules:
 * supabase/migrations/0008_error_reports.sql.
 */

const MAX_PER_SESSION = 5;
const sent = new Set<string>();

// Numbers and emails in an error message could be someone's data; blank them.
function scrub(text: string): string {
  return text.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>").replace(/\d{4,}/g, "<n>");
}

export function reportError(error: unknown): void {
  if (typeof window === "undefined" || !usePrivacy.getState().errorReports) return;
  const err = error instanceof Error ? error : new Error(String(error));
  const message = scrub(err.message || "Unknown error").slice(0, 500);
  if (sent.has(message) || sent.size >= MAX_PER_SESSION) return;
  sent.add(message);
  const sb = getSupabase();
  if (!sb) return;
  void sb
    .from("error_reports")
    .insert({
      message,
      stack: err.stack ? scrub(err.stack).slice(0, 2000) : null,
      path: window.location.pathname.slice(0, 200),
      user_agent: navigator.userAgent.slice(0, 300),
    })
    .then(
      () => undefined,
      () => undefined,
    );
}
