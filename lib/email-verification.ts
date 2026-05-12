import { createHmac, randomInt, timingSafeEqual } from "crypto";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const VERIFIED_EMAIL_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface EmailChallengePayload {
  email: string;
  codeHash: string;
  expiresAt: number;
  nonce: string;
}

interface VerifiedEmailPayload {
  email: string;
  expiresAt: number;
  nonce: string;
}

function getSigningSecret(): string {
  return (
    process.env.EMAIL_VERIFICATION_SECRET ||
    process.env.RESEND_API_KEY ||
    process.env.TURNSTILE_SECRET_KEY ||
    "pastaa-dev-email-verification-secret"
  );
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string): string {
  return createHmac("sha256", getSigningSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function createSignedToken(payload: unknown): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function parseSignedToken<T>(token: string): T | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !safeEqual(sign(encodedPayload), signature)) return null;

  try {
    return JSON.parse(base64UrlDecode(encodedPayload)) as T;
  } catch {
    return null;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateEmailCode(): string {
  return randomInt(100000, 1000000).toString();
}

export function createEmailChallenge(email: string, code: string): string {
  const normalizedEmail = normalizeEmail(email);
  const payload: EmailChallengePayload = {
    email: normalizedEmail,
    codeHash: sign(`${normalizedEmail}:${code}`),
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
    nonce: randomInt(100000000, 999999999).toString(),
  };

  return createSignedToken(payload);
}

export function verifyEmailChallenge(email: string, code: string, token: string): boolean {
  const normalizedEmail = normalizeEmail(email);
  const payload = parseSignedToken<EmailChallengePayload>(token);

  if (!payload || payload.expiresAt <= Date.now() || payload.email !== normalizedEmail) return false;
  return safeEqual(payload.codeHash, sign(`${normalizedEmail}:${code.trim()}`));
}

export function createVerifiedEmailToken(email: string): string {
  const payload: VerifiedEmailPayload = {
    email: normalizeEmail(email),
    expiresAt: Date.now() + VERIFIED_EMAIL_TTL_MS,
    nonce: randomInt(100000000, 999999999).toString(),
  };

  return createSignedToken(payload);
}

export function verifyVerifiedEmailToken(email: string, token: string): boolean {
  const normalizedEmail = normalizeEmail(email);
  const payload = parseSignedToken<VerifiedEmailPayload>(token);

  return Boolean(payload && payload.expiresAt > Date.now() && payload.email === normalizedEmail);
}
