import type { Env } from "./types";
import { assert, hash, HttpError, json, readJson, token } from "./http";

export const ACCESS_TTL_MS = 20 * 60 * 1000;
const ACTION = "pastaa-access";

export function allowedOrigins(env: Env) {
  const main = new URL(env.APP_URL);
  const origins = [main.origin];
  if (main.protocol === "https:")
    origins.push(`${main.protocol}//chat.${main.hostname}`);
  else if (["localhost", "127.0.0.1"].includes(main.hostname))
    origins.push(
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:8787",
      "http://127.0.0.1:8787",
    );
  return origins;
}
export function assertRequestOrigin(request: Request, env: Env) {
  const origins = allowedOrigins(env);
  assert(
    origins.includes(new URL(request.url).origin),
    "Host non consentito",
    403,
  );
  const origin = request.headers.get("Origin");
  assert(!origin || origins.includes(origin), "Origine non consentita", 403);
  assert(
    request.headers.get("Sec-Fetch-Site") !== "cross-site",
    "Origine non consentita",
    403,
  );
  if (request.method !== "GET" && new URL(env.APP_URL).protocol === "https:")
    assert(
      origin === new URL(request.url).origin,
      "Origine mancante o non consentita",
      403,
    );
}
export function cookieName(env: Env) {
  return new URL(env.APP_URL).protocol === "https:"
    ? "__Host-pastaa_access"
    : "pastaa_access";
}
async function signingKey(env: Env) {
  assert(
    env.RATE_LIMIT_SECRET?.length >= 32,
    "Configurazione anti-abuso mancante",
    503,
  );
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`pastaa-access-v1:${env.RATE_LIMIT_SECRET}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
async function fingerprint(request: Request, env: Env) {
  return hash(
    `pastaa-fingerprint-v1:${env.RATE_LIMIT_SECRET}\n${new URL(request.url).host}\n${request.headers.get("CF-Connecting-IP") ?? "local"}\n${request.headers.get("User-Agent") ?? ""}`,
  );
}
export async function issueAccessToken(
  request: Request,
  env: Env,
  expiresAt = Date.now() + ACCESS_TTL_MS,
) {
  const payload = `1.${expiresAt}.${token()}.${await fingerprint(request, env)}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(env),
    new TextEncoder().encode(payload),
  );
  return {
    value: `${payload}.${Buffer.from(signature).toString("base64url")}`,
    expiresAt,
  };
}
export async function accessSession(request: Request, env: Env) {
  const cookie = request.headers.get("Cookie") ?? "";
  if (cookie.length > 8192) return null;
  const values = cookie
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.startsWith(`${cookieName(env)}=`));
  if (values.length !== 1) return null;
  const value = values[0].slice(cookieName(env).length + 1);
  const match =
    /^1\.(\d{13})\.([A-Za-z0-9_-]{43})\.([a-f0-9]{64})\.([A-Za-z0-9_-]{43})$/.exec(
      value,
    );
  if (!match) return null;
  const expiresAt = Number(match[1]);
  if (expiresAt <= Date.now() || expiresAt > Date.now() + ACCESS_TTL_MS + 1000)
    return null;
  const payload = value.slice(0, value.lastIndexOf("."));
  if (
    !(await crypto.subtle.verify(
      "HMAC",
      await signingKey(env),
      Buffer.from(match[4], "base64url"),
      new TextEncoder().encode(payload),
    ))
  )
    return null;
  if (match[3] !== (await fingerprint(request, env))) return null;
  return { id: match[2], expiresAt };
}
export function accessRequired() {
  return json(
    {
      error: "Completa la verifica anti-bot per continuare.",
      code: "ACCESS_REQUIRED",
    },
    401,
  );
}
export async function fastLimit(binding: RateLimit | undefined, key: string) {
  assert(binding, "Configurazione anti-abuso mancante", 503);
  if (!(await binding.limit({ key })).success)
    throw new HttpError(429, "Troppe richieste. Riprova fra un minuto.");
}
export async function accessEndpoint(request: Request, env: Env) {
  await fastLimit(
    env.ACCESS_LIMITER,
    request.headers.get("CF-Connecting-IP") ?? "local",
  );
  const existing = await accessSession(request, env);
  if (request.method === "GET")
    return existing
      ? json({ expiresAt: existing.expiresAt })
      : accessRequired();
  assert(request.method === "POST", "Metodo non consentito", 405);
  const body = await readJson(request, 4096);
  assert(
    typeof body.token === "string" &&
      body.token.length > 0 &&
      body.token.length <= 2048,
    "Verifica anti-bot mancante",
    400,
  );
  assert(env.TURNSTILE_SECRET_KEY, "Verifica anti-bot non disponibile", 503);
  let result: { success?: boolean; hostname?: string; action?: string };
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: body.token,
          remoteip: request.headers.get("CF-Connecting-IP") ?? "",
        }),
      },
    );
    assert(response.ok, "Verifica anti-bot non disponibile", 503);
    result = await response.json();
  } catch {
    throw new HttpError(503, "Verifica anti-bot non disponibile. Riprova.");
  }
  assert(
    result.success === true &&
      result.hostname === new URL(request.url).hostname &&
      result.action === ACTION,
    "Verifica anti-bot non valida. Riprova.",
    403,
  );
  const issued = await issueAccessToken(request, env);
  const response = json({ expiresAt: issued.expiresAt });
  response.headers.set(
    "Set-Cookie",
    `${cookieName(env)}=${issued.value}; Path=/; Max-Age=${ACCESS_TTL_MS / 1000}; HttpOnly; SameSite=Strict${new URL(env.APP_URL).protocol === "https:" ? "; Secure" : ""}`,
  );
  return response;
}
