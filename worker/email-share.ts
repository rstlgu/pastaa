import type { Env } from "./types";
import { json, readJson, assert, hash } from "./http";
import { consume, clientKey } from "./rate-limit";
const NextResponse = {
  json: (body: unknown, init?: { status?: number }) => json(body, init?.status),
};
type NextRequest = Request;
import { Resend } from "resend";

import {
  normalizeEmail,
  verifyVerifiedEmailToken,
} from "../lib/email-verification";
import { isDisposableEmail } from "../lib/disposable-email";

const DEFAULT_FROM = "Pastaa <onboarding@resend.dev>";
const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_DAILY_MS = 24 * 60 * 60 * 1000;
const MAX_EMAILS_PER_IP_PER_HOUR = 3;
const MAX_EMAILS_PER_IP_PER_DAY = 10;
const MAX_EMAILS_PER_RECIPIENT_PER_HOUR = 2;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizeFromAddress(from?: string): string | null {
  const trimmed = from?.trim();
  if (!trimmed) return DEFAULT_FROM;

  const unquoted = trimmed.replace(/^["'](.+)["']$/, "$1").trim();
  const namedAddressMatch = unquoted.match(/^([^<>]+?)\s*<([^<>]+)>$/);
  if (namedAddressMatch) {
    const name = namedAddressMatch[1]
      .trim()
      .replace(/^["'](.+)["']$/, "$1")
      .trim();
    const email = namedAddressMatch[2].trim();
    if (!name || !isValidEmail(email)) return null;
    return `${name} <${email}>`;
  }

  return isValidEmail(unquoted) ? unquoted : null;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get("CF-Connecting-IP") || "local";
}

async function verifyTurnstileToken(
  token: string,
  ip: string,
  env: Env,
): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  if (ip !== "unknown") formData.append("remoteip", ip);

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      },
    );
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}

function validateShareUrl(
  shareUrl: string,
  shortId: string,
  env: Env,
): { ok: true } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(shareUrl);
  } catch {
    return { ok: false, error: "URL non valido" };
  }

  const expectedPath = `/v/${shortId}`;
  if (url.pathname !== expectedPath) {
    return { ok: false, error: "URL non corrispondente al paste" };
  }

  if (!url.hash || url.hash.length < 12) {
    return { ok: false, error: "Chiave di decifratura mancante nel link" };
  }

  const appUrl = env.APP_URL?.trim();
  if (appUrl) {
    try {
      const expectedOrigin = new URL(appUrl).origin;
      if (url.origin !== expectedOrigin) {
        return { ok: false, error: "Origine del link non consentita" };
      }
    } catch {
      return {
        ok: false,
        error: "Configurazione NEXT_PUBLIC_APP_URL non valida",
      };
    }
  }

  return { ok: true };
}

export async function POST(request: NextRequest, env: Env) {
  try {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Invio email non configurato (RESEND_API_KEY)" },
        { status: 503 },
      );
    }

    assert(
      env.EMAIL_VERIFICATION_SECRET &&
        env.EMAIL_VERIFICATION_SECRET.length >= 32,
      "Verifica email non configurata",
      503,
    );
    const body = await readJson(request, 16000);
    const {
      to,
      fromEmail,
      senderVerificationToken,
      shareUrl,
      shortId,
      message,
      subject,
      locale,
      captchaToken,
    } = body as {
      to?: string;
      fromEmail?: string;
      senderVerificationToken?: string;
      shareUrl?: string;
      shortId?: string;
      message?: string;
      subject?: string;
      locale?: string;
      captchaToken?: string;
    };

    const isItalian = locale === "it";

    if (!to || !isValidEmail(to)) {
      return NextResponse.json(
        { error: "Email destinatario non valida" },
        { status: 400 },
      );
    }

    if (isDisposableEmail(to)) {
      return NextResponse.json(
        { error: "Email temporanee non consentite" },
        { status: 400 },
      );
    }

    if (
      !fromEmail ||
      !isValidEmail(fromEmail) ||
      isDisposableEmail(fromEmail) ||
      !senderVerificationToken ||
      !verifyVerifiedEmailToken(
        fromEmail,
        senderVerificationToken,
        env.EMAIL_VERIFICATION_SECRET,
      )
    ) {
      return NextResponse.json(
        { error: "Conferma il tuo indirizzo e-mail prima di inviare" },
        { status: 403 },
      );
    }

    const clientIp = getClientIp(request);
    const limiterId = await clientKey(request, env);
    const normalizedRecipient = to.trim().toLowerCase();
    const normalizedSender = normalizeEmail(fromEmail);
    const isAllowed =
      (await consume(
        env.DB,
        `email:ip-hour:${limiterId}`,
        MAX_EMAILS_PER_IP_PER_HOUR,
        RATE_LIMIT_WINDOW_MS,
      )) &&
      (await consume(
        env.DB,
        `email:ip-day:${limiterId}`,
        MAX_EMAILS_PER_IP_PER_DAY,
        RATE_LIMIT_DAILY_MS,
      )) &&
      (await consume(
        env.DB,
        `email:recipient-hour:${limiterId}:${await hash(normalizedRecipient)}`,
        MAX_EMAILS_PER_RECIPIENT_PER_HOUR,
        RATE_LIMIT_WINDOW_MS,
      ));

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Troppe email inviate. Riprova più tardi." },
        { status: 429 },
      );
    }

    if (!captchaToken || typeof captchaToken !== "string") {
      return NextResponse.json(
        { error: "Verifica anti-bot mancante" },
        { status: 403 },
      );
    }

    const isCaptchaValid = await verifyTurnstileToken(
      captchaToken,
      clientIp,
      env,
    );
    if (!isCaptchaValid) {
      return NextResponse.json(
        { error: "Verifica anti-bot non valida" },
        { status: 403 },
      );
    }

    if (
      !shareUrl ||
      typeof shareUrl !== "string" ||
      !shortId ||
      typeof shortId !== "string"
    ) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    const urlCheck = validateShareUrl(shareUrl, shortId, env);
    if (!urlCheck.ok) {
      return NextResponse.json({ error: urlCheck.error }, { status: 400 });
    }

    const paste = await env.DB.prepare(
      "SELECT id FROM Paste WHERE shortId=? AND expiresAt>?",
    )
      .bind(shortId, Date.now())
      .first();
    if (!paste) {
      return NextResponse.json({ error: "Paste non trovato" }, { status: 404 });
    }

    const rawMessage = typeof message === "string" ? message.trim() : "";
    const safeMessage =
      rawMessage.length > MAX_MESSAGE_LENGTH
        ? rawMessage.slice(0, MAX_MESSAGE_LENGTH)
        : rawMessage;

    const emailSubject =
      typeof subject === "string" && subject.trim().length > 0
        ? subject.trim().slice(0, 200)
        : "Pastaa — encrypted link";

    const from = normalizeFromAddress(env.RESEND_FROM);
    if (!from) {
      return NextResponse.json(
        {
          error:
            "RESEND_FROM non valido. Usa email@example.com oppure Name <email@example.com> senza virgolette.",
        },
        { status: 503 },
      );
    }

    const introHtml = safeMessage
      ? `<p style="margin:0 0 16px;">${escapeHtml(safeMessage).replace(/\n/g, "<br/>")}</p>`
      : "";

    const lead = isItalian
      ? "Contenuto cifrato end-to-end su Pastaa. Apri il link nel browser:"
      : "End-to-end encrypted content on Pastaa. Open this link in your browser:";
    const cta = isItalian ? "Apri il link Pastaa" : "Open Pastaa link";
    const hint = isItalian
      ? "Se il pulsante non funziona, copia questo URL completo (incluso tutto dopo #):"
      : "If the button does not work, copy this full URL (including everything after #):";

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  ${introHtml}
  <p style="margin:0 0 12px;">${lead}</p>
  <p style="margin:0 0 16px;"><a href="${escapeHtml(shareUrl)}">${cta}</a></p>
  <p style="margin:0; font-size: 12px; color: #555;">${hint}</p>
  <pre style="font-size: 11px; word-break: break-all; background: #f4f4f5; padding: 12px; border-radius: 8px;">${escapeHtml(
    shareUrl,
  )}</pre>
</body>
</html>`;

    const textLead = isItalian
      ? "Contenuto cifrato end-to-end su Pastaa. Apri questo link nel browser:"
      : "End-to-end encrypted content on Pastaa. Open this link in your browser:";

    const text = [safeMessage || undefined, textLead, shareUrl]
      .filter(Boolean)
      .join("\n\n");

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: normalizedRecipient,
      replyTo: normalizedSender,
      subject: emailSubject,
      html,
      text,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: error.message || "Invio email fallito" },
        { status: 502 },
      );
    }

    return NextResponse.json({ id: data?.id }, { status: 200 });
  } catch (error) {
    console.error("share-paste-email:", error);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
