"use client";

import { getSupabase, hasSupabase } from "@/lib/supabase";
import { useAuth } from "@/stores/auth";
import { useShalatPrefs } from "@/stores/shalat";
import { isNative } from "@/lib/native";

/**
 * Web Push for Twogether. Needs:
 *  - NEXT_PUBLIC_VAPID_PUBLIC_KEY in the hosting env,
 *  - Supabase with migration 0006_push.sql and the `notify` edge function.
 * Without those the app keeps using in-app toasts (PingListener).
 */
const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState =
  | "unsupported" // browser/app can't do Web Push
  | "needs-install" // iPhone Safari: add to Home Screen first
  | "not-configured" // server side not set up yet
  | "off"
  | "on"
  | "denied";

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function urlB64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (isNative()) return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (!VAPID || !hasSupabase()) return "not-configured";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

/** Subscribe this device and store it for the partner-notification function. */
export async function enablePush(opts: { adzan: boolean }): Promise<PushState> {
  const state = await pushState();
  if (state === "unsupported" || state === "needs-install" || state === "not-configured") return state;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID) }));
  await saveSubscription(sub, opts.adzan);
  return "on";
}

export async function saveSubscription(sub: PushSubscription, adzan: boolean) {
  const sb = getSupabase();
  const { supaUserId, supaWorkspaceId, name } = useAuth.getState();
  if (!sb || !supaUserId || !supaWorkspaceId) throw new Error("Hubungkan akun ke server dulu (Pengaturan → Pasangan).");
  const json = sub.toJSON();
  const place = useShalatPrefs.getState();
  const { error } = await sb.from("push_subscriptions").upsert(
    {
      endpoint: sub.endpoint,
      workspace_id: supaWorkspaceId,
      user_id: supaUserId,
      member_name: name,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      adzan,
      lat: adzan ? place.lat : null,
      lng: adzan ? place.lng : null,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const sb = getSupabase();
  await sb?.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

/** Re-save adzan preference / location for an existing subscription. */
export async function updatePushPrefs(adzan: boolean) {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await saveSubscription(sub, adzan);
}
