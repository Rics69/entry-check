/**
 * Подпись колбэков RollyPay (docs.rollypay.io/api/callbacks):
 * HMAC-SHA256 ключом signing_secret от строки `X-Timestamp + "." + сырое тело`, hex.
 * Web Crypto — работает и в Cloudflare Workers, и в Node.
 */

export const MAX_SKEW_SECONDS = 300;

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Сравнение за постоянное время: по времени ответа нельзя подобрать подпись. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type SignatureCheck = "ok" | "missing" | "stale" | "invalid";

/** Колбэки старше 5 минут отклоняем — защита от повторной отправки перехваченного запроса. */
export async function verifySignature(input: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  nowSeconds?: number;
}): Promise<SignatureCheck> {
  const { rawBody, timestamp, signature, secret } = input;
  if (!timestamp || !signature) return "missing";
  const ts = Number(timestamp);
  const now = input.nowSeconds ?? Date.now() / 1000;
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_SECONDS) return "stale";
  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
  return timingSafeEqual(expected, signature.trim().toLowerCase()) ? "ok" : "invalid";
}
