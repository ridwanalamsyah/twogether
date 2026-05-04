/**
 * Privacy-first cryptography helpers.
 *
 * - Uses Web Crypto API (no third-party crypto deps).
 * - AES-GCM 256 with random 12-byte IV per record.
 * - Keys are derived from the user's password via PBKDF2 (210k iterations,
 *   matching OWASP 2024 guidance for SHA-256).
 * - Per-user salt persisted in `users.encSalt`.
 * - Keys are held only in memory after sign-in; never written to disk.
 *
 * This module is the foundation for "local encryption" of sensitive notes
 * (Moments) and any future field-level encrypted data.
 */

const TEXT = new TextEncoder();
const TEXT_DEC = new TextDecoder();
const PBKDF_ITER = 210_000;

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const view = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < view.length; i++) s += String.fromCharCode(view[i]);
  return btoa(s);
}

function b64decode(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesFromString(s: string): Uint8Array<ArrayBuffer> {
  const enc = TEXT.encode(s);
  const buf = new ArrayBuffer(enc.byteLength);
  const out = new Uint8Array(buf);
  out.set(enc);
  return out;
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(n);
  const u = new Uint8Array(buf);
  crypto.getRandomValues(u);
  return u;
}

export function generateSalt(): string {
  return b64encode(randomBytes(16));
}

async function deriveKey(password: string, saltB64: string): Promise<CryptoKey> {
  const salt = b64decode(saltB64);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    bytesFromString(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF_ITER, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** In-memory key cache, scoped per session. */
let CURRENT_KEY: CryptoKey | null = null;

export async function unlockKey(password: string, saltB64: string): Promise<void> {
  CURRENT_KEY = await deriveKey(password, saltB64);
}

export function lockKey(): void {
  CURRENT_KEY = null;
}

export function isUnlocked(): boolean {
  return CURRENT_KEY !== null;
}

export async function encryptString(plaintext: string): Promise<string> {
  if (!CURRENT_KEY) {
    throw new Error("Encryption key locked — sign in again to unlock");
  }
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    CURRENT_KEY,
    bytesFromString(plaintext),
  );
  // Pack IV + ciphertext into one base64 blob so storage is a single column.
  const packed = new Uint8Array(iv.byteLength + ct.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ct), iv.byteLength);
  return b64encode(packed);
}

export async function decryptString(packedB64: string): Promise<string> {
  if (!CURRENT_KEY) {
    throw new Error("Encryption key locked — sign in again to unlock");
  }
  const packed = b64decode(packedB64);
  const iv = packed.slice(0, 12);
  const ct = packed.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, CURRENT_KEY, ct);
  return TEXT_DEC.decode(pt);
}

/**
 * One-way password hash for local auth fallback when no backend is configured.
 * Production deployments should defer to Supabase auth instead.
 */
export async function hashPassword(password: string, saltB64: string): Promise<string> {
  const salt = b64decode(saltB64);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    bytesFromString(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF_ITER, hash: "SHA-256" },
    baseKey,
    256,
  );
  return b64encode(bits);
}
