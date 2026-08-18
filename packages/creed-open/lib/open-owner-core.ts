import { createHmac, timingSafeEqual } from "node:crypto";

export const OPEN_OWNER_COOKIE_VERSION = "v1";
export const OPEN_OWNER_CODE_LENGTH = 8;

export function isOpenOwnerCode(value: string) {
  return new RegExp(`^\\d{${OPEN_OWNER_CODE_LENGTH}}$`).test(value);
}

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function safelyEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

export function createOpenOwnerCookieValue(secret: string, expiresAt: number) {
  const payload = `${OPEN_OWNER_COOKIE_VERSION}.${expiresAt}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyOpenOwnerCookieValue(
  value: string,
  secret: string,
  now = Date.now(),
) {
  const [version, expiresAtRaw, suppliedSignature, ...rest] = value.split(".");
  if (
    rest.length > 0 ||
    version !== OPEN_OWNER_COOKIE_VERSION ||
    !expiresAtRaw ||
    !suppliedSignature
  ) {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;
  const payload = `${version}.${expiresAtRaw}`;
  return safelyEqual(suppliedSignature, signature(payload, secret));
}

export function deriveOpenOwnerSupabasePassword(secret: string) {
  return signature("creed-open-supabase-password-v1", secret);
}
