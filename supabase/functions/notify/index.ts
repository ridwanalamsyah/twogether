// Supabase Edge Function: sends Web Push notifications for Twogether.
//
// Triggers
//   1. Database Webhook (entries INSERT / moments INSERT) → partner gets
//      "💗 Alya kangen kamu" or "💌 Alya menulis moment baru".
//   2. Cron every 5 minutes with body {"mode":"adzan"} → adzan reminder for
//      devices that switched it on (prayer times computed here).
//
// Secrets (supabase secrets set …): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT (mailto:you@example.com), NOTIFY_SECRET (any random string,
// also sent by the webhook/cron as the "x-notify-secret" header).
// See README → "Notifikasi push".

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "npm:adhan@4.4.3";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const PINGS: Record<string, [string, string]> = {
  kangen: ["💗", "{from} kangen kamu"],
  peluk: ["🤗", "{from} kirim pelukan"],
  otw: ["🛵", "{from} lagi OTW"],
  sampai: ["🏠", "{from} sudah sampai"],
  makan: ["🍽️", "{from} nanya: udah makan belum?"],
  tidur: ["😴", "{from} mau tidur. Selamat malam 🌙"],
};

interface Sub {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
  workspace_id: string;
  lat: number | null;
  lng: number | null;
  tz: string | null;
  last_adzan: string | null;
}

async function send(sub: Sub, payload: Record<string, unknown>) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    );
  } catch (err) {
    const code = (err as { statusCode?: number }).statusCode;
    // Subscription expired or revoked → forget it.
    if (code === 404 || code === 410) {
      await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    } else {
      console.error("push failed", code, (err as Error).message);
    }
  }
}

async function notifyPartners(workspaceId: string, senderId: string, payload: Record<string, unknown>) {
  const { data } = await sb
    .from("push_subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .neq("user_id", senderId);
  await Promise.all((data ?? []).map((s) => send(s as Sub, payload)));
}

const PRAYER_NAMES: [keyof PrayerTimes, string][] = [
  ["fajr", "Subuh"],
  ["dhuhr", "Dzuhur"],
  ["asr", "Ashar"],
  ["maghrib", "Maghrib"],
  ["isha", "Isya"],
];

function localYmd(tz: string, at: Date): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(at)
    .split("-")
    .map(Number);
  return [parts[0], parts[1], parts[2]];
}

async function adzanTick() {
  const { data } = await sb.from("push_subscriptions").select("*").eq("adzan", true);
  const now = new Date();
  for (const raw of data ?? []) {
    const sub = raw as Sub;
    if (sub.lat == null || sub.lng == null) continue;
    const tz = sub.tz || "Asia/Jakarta";
    const [y, m, d] = localYmd(tz, now);
    const params = CalculationMethod.Singapore(); // Fajr 20°, Isha 18° (Kemenag)
    params.madhab = Madhab.Shafi;
    params.adjustments = { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 };
    const pt = new PrayerTimes(new Coordinates(sub.lat, sub.lng), new Date(y, m - 1, d), params);
    for (const [key, name] of PRAYER_NAMES) {
      const at = pt[key] as unknown as Date;
      const diff = now.getTime() - at.getTime();
      const tag = `${y}-${m}-${d}-${name}`;
      // Fire once, within 6 minutes after the time (cron runs every 5).
      if (diff >= 0 && diff < 6 * 60_000 && sub.last_adzan !== tag) {
        await send(sub, { title: `🕌 Waktunya ${name}`, body: "Yuk shalat dulu 🤍", url: "/shalat", tag: "adzan" });
        await sb.from("push_subscriptions").update({ last_adzan: tag }).eq("endpoint", sub.endpoint);
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.headers.get("x-notify-secret") !== Deno.env.get("NOTIFY_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const body = await req.json().catch(() => ({}));

  if (body.mode === "adzan") {
    await adzanTick();
    return new Response("ok");
  }

  const rec = body.record ?? {};
  if (body.type === "INSERT" && body.table === "entries" && rec.kind === "ping") {
    const from = rec.who ?? "Pasanganmu";
    let emoji = "✍️";
    let text = "";
    if (rec.value_text === "custom") {
      let custom = "";
      try {
        custom = JSON.parse(rec.payload ?? "{}").text ?? "";
      } catch {
        /* ignore */
      }
      text = `${from}: ${custom}`;
    } else {
      const [e, t] = PINGS[rec.value_text] ?? PINGS.kangen;
      emoji = e;
      text = t.replace("{from}", from);
    }
    await notifyPartners(rec.workspace_id, rec.user_id, { title: `${emoji} Twogether`, body: text, url: "/kabar", tag: "ping" });
  } else if (body.type === "INSERT" && body.table === "moments") {
    const { data: profile } = await sb.from("profiles").select("name").eq("id", rec.user_id).maybeSingle();
    await notifyPartners(rec.workspace_id, rec.user_id, {
      title: "💌 Moment baru",
      body: `${profile?.name ?? "Pasanganmu"} menulis: ${rec.title ?? "moment baru"}`,
      url: "/moments",
      tag: "moment",
    });
  }
  return new Response("ok");
});
