import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  createEmailChallenge,
  createVerifiedEmailToken,
  generateEmailCode,
  normalizeEmail,
  verifyEmailChallenge,
} from "@/lib/email-verification";

const DEFAULT_FROM = "Pastaa <onboarding@resend.dev>";
const VERIFY_WINDOW_MS = 60 * 60 * 1000;
const VERIFY_DAILY_MS = 24 * 60 * 60 * 1000;
const MAX_VERIFY_EMAILS_PER_IP_HOUR = 3;
const MAX_VERIFY_EMAILS_PER_IP_DAY = 8;
const MAX_VERIFY_EMAILS_PER_ADDRESS_HOUR = 2;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const verifyRateLimitStore = new Map<string, RateLimitBucket>();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeFromAddress(from?: string): string | null {
  const trimmed = from?.trim();
  if (!trimmed) return DEFAULT_FROM;

  const unquoted = trimmed.replace(/^["'](.+)["']$/, "$1").trim();
  const namedAddressMatch = unquoted.match(/^([^<>]+?)\s*<([^<>]+)>$/);
  if (namedAddressMatch) {
    const name = namedAddressMatch[1].trim().replace(/^["'](.+)["']$/, "$1").trim();
    const email = namedAddressMatch[2].trim();
    if (!name || !isValidEmail(email)) return null;
    return `${name} <${email}>`;
  }

  return isValidEmail(unquoted) ? unquoted : null;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip") ||
    forwardedFor ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function consumeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = verifyRateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    verifyRateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) return false;

  current.count += 1;
  return true;
}

function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, bucket] of Array.from(verifyRateLimitStore.entries())) {
    if (bucket.resetAt <= now) verifyRateLimitStore.delete(key);
  }
}

async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  if (ip !== "unknown") formData.append("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, code, challengeToken, captchaToken, locale } = body as {
      action?: "request" | "confirm";
      email?: string;
      code?: string;
      challengeToken?: string;
      captchaToken?: string;
      locale?: string;
    };

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Email non valida" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);

    if (action === "confirm") {
      if (!code || !challengeToken || !verifyEmailChallenge(normalizedEmail, code, challengeToken)) {
        return NextResponse.json({ error: "Codice non valido o scaduto" }, { status: 400 });
      }

      return NextResponse.json({
        email: normalizedEmail,
        verificationToken: createVerifiedEmailToken(normalizedEmail),
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Invio email non configurato (RESEND_API_KEY)" },
        { status: 503 }
      );
    }

    const from = normalizeFromAddress(process.env.RESEND_FROM);
    if (!from) {
      return NextResponse.json({ error: "RESEND_FROM non valido" }, { status: 503 });
    }

    cleanupRateLimitStore();

    const clientIp = getClientIp(request);
    const isAllowed =
      consumeRateLimit(`verify:ip-hour:${clientIp}`, MAX_VERIFY_EMAILS_PER_IP_HOUR, VERIFY_WINDOW_MS) &&
      consumeRateLimit(`verify:ip-day:${clientIp}`, MAX_VERIFY_EMAILS_PER_IP_DAY, VERIFY_DAILY_MS) &&
      consumeRateLimit(
        `verify:address-hour:${normalizedEmail}`,
        MAX_VERIFY_EMAILS_PER_ADDRESS_HOUR,
        VERIFY_WINDOW_MS
      );

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Troppe richieste di verifica. Riprova più tardi." },
        { status: 429 }
      );
    }

    if (!captchaToken || typeof captchaToken !== "string") {
      return NextResponse.json({ error: "Verifica anti-bot mancante" }, { status: 403 });
    }

    const isCaptchaValid = await verifyTurnstileToken(captchaToken, clientIp);
    if (!isCaptchaValid) {
      return NextResponse.json({ error: "Verifica anti-bot non valida" }, { status: 403 });
    }

    const verificationCode = generateEmailCode();
    const nextChallengeToken = createEmailChallenge(normalizedEmail, verificationCode);
    const isItalian = locale === "it";
    const subject = isItalian ? "Codice di verifica Pastaa" : "Your Pastaa verification code";
    const lead = isItalian
      ? "Usa questo codice per confermare il tuo indirizzo e-mail:"
      : "Use this code to confirm your email address:";

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: normalizedEmail,
      subject,
      html: `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p style="margin:0 0 12px;">${escapeHtml(lead)}</p>
  <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0 0 16px;">${verificationCode}</p>
  <p style="margin:0; font-size: 12px; color: #555;">Pastaa non ti chiederà mai questo codice altrove.</p>
</body>
</html>`,
      text: `${lead}\n\n${verificationCode}`,
    });

    if (error) {
      console.error("Resend verification error:", error);
      return NextResponse.json(
        { error: error.message || "Invio codice non riuscito" },
        { status: 502 }
      );
    }

    return NextResponse.json({ challengeToken: nextChallengeToken });
  } catch (error) {
    console.error("share-paste-email/verify:", error);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
