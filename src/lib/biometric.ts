"use client";

import { isNative } from "@/lib/native";

/**
 * Face ID / Touch ID / sidik jari as a local unlock gate using WebAuthn
 * platform authenticators. Nothing leaves the device; it only proves the
 * phone's owner is holding it (same trust level as the PIN).
 */
function b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(buf))));
}
function unb64(s: string): Uint8Array<ArrayBuffer> {
  const raw = atob(s);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}
function challenge(): Uint8Array<ArrayBuffer> {
  const c = new Uint8Array(new ArrayBuffer(32));
  crypto.getRandomValues(c);
  return c;
}

export async function biometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || isNative()) return false;
  if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Create a device credential; returns its id to store. */
export async function registerBiometric(name: string): Promise<string> {
  const userId = challenge().slice(0, 16);
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: "Twogether", id: window.location.hostname },
      user: { id: userId, name: name || "twogether", displayName: name || "Twogether" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "discouraged",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Dibatalkan");
  return b64(cred.rawId);
}

export async function verifyBiometric(credId: string): Promise<boolean> {
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: challenge(),
        allowCredentials: [{ type: "public-key", id: unb64(credId), transports: ["internal"] }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return !!res;
  } catch {
    return false;
  }
}
