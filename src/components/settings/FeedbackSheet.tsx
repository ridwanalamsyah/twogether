"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { getSupabase } from "@/lib/supabase";
import { WHATS_NEW } from "@/lib/whatsNew";
import { toast } from "@/lib/toast";

/**
 * "Kirim masukan": a bug, an idea, anything. Saved to the feedback table
 * (supabase/migrations/0009_feedback.sql) with the app version and browser,
 * nothing else from the phone.
 */
export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const message = text.trim();
    if (!message) return;
    setSending(true);
    const sb = getSupabase();
    const { data } = sb ? await sb.auth.getSession() : { data: { session: null } };
    const { error } =
      sb && data.session
        ? await sb.from("feedback").insert({
            message: message.slice(0, 2000),
            app_version: WHATS_NEW.id,
            user_agent: navigator.userAgent.slice(0, 300),
          })
        : { error: new Error("offline") };
    setSending(false);
    if (error) {
      toast("Belum terkirim. Cek internet lalu coba lagi.", "warn");
      return;
    }
    toast("Terima kasih! Masukanmu sudah terkirim 💌");
    onClose();
  }

  return (
    <Sheet
      title="Kirim masukan"
      onClose={onClose}
      footer={
        <button onClick={send} disabled={!text.trim() || sending} className="btn-accent w-full disabled:opacity-50">
          {sending ? "Mengirim…" : "Kirim"}
        </button>
      }
    >
      <p className="mb-3 text-[13px] text-text-3">
        Ada yang error, membingungkan, atau ide fitur? Tulis saja, sesingkat apa pun.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        maxLength={2000}
        autoFocus
        placeholder="mis. Di halaman Uang, tombol simpan kadang tidak muncul…"
        className="input-base w-full resize-none"
      />
    </Sheet>
  );
}
