import { AUTH_SECRET, isSecureOrigin } from "./env";

const COOKIE_NAME = "habit_session";
const SESSION_DAYS = 7;

export type Payload = { v: number; iat: number; exp: number; jti: string };

function b64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(input: string): Uint8Array {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const bin = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSession(): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: Payload = {
    v: 1,
    iat: nowSeconds,
    exp: nowSeconds + SESSION_DAYS * 24 * 60 * 60,
    jti: crypto.randomUUID(),
  };
  const payloadB64 = b64url(new TextEncoder().encode(JSON.stringify(payload)).buffer as ArrayBuffer);
  const key = await getHmacKey(AUTH_SECRET());
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64).buffer as ArrayBuffer);
  return `${payloadB64}.${b64url(sig)}`;
}

export async function verifySession(token: string): Promise<Payload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  try {
    const payloadBytes = fromB64url(payloadB64);
    const payload: Payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (payload.v !== 1 || typeof payload.exp !== "number") return null;
    if (Math.floor(Date.now() / 1000) >= payload.exp) return null;
    const key = await getHmacKey(AUTH_SECRET());
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      fromB64url(sigB64).buffer as ArrayBuffer,
      new TextEncoder().encode(payloadB64).buffer as ArrayBuffer
    );
    return ok ? payload : null;
  } catch {
    return null;
  }
}

export function serializeSessionCookie(token: string): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ];
  if (isSecureOrigin()) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(): string {
  const parts = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (isSecureOrigin()) parts.push("Secure");
  return parts.join("; ");
}

export function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return rest.join("=") || null;
  }
  return null;
}
