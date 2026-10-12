import type { Env } from "./types";
import { assert, hash, HttpError } from "./http";
export async function consume(
  db: D1Database,
  key: string,
  limit: number,
  windowMs: number,
  amount = 1,
) {
  if (!Number.isInteger(amount) || amount < 1 || amount > limit) return false;
  const now = Date.now(),
    bucket = Math.floor(now / windowMs),
    expiresAt = (bucket + 1) * windowMs;
  const row = await db
    .prepare(
      "INSERT INTO RateLimit(key,count,expiresAt) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=count+excluded.count WHERE count+excluded.count<=? RETURNING count",
    )
    .bind(`${key}:${bucket}`, amount, expiresAt, limit)
    .first<{ count: number }>();
  return !!row && row.count <= limit;
}
export async function clientKey(request: Request, env: Env) {
  assert(
    env.RATE_LIMIT_SECRET?.length >= 32,
    "Configurazione anti-abuso mancante",
    503,
  );
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  return hash(`${env.RATE_LIMIT_SECRET}:${ip}`);
}
export async function limitApi(request: Request, env: Env) {
  const key = await clientKey(request, env);
  if (
    !(await consume(env.DB, `ip:${key}`, 360, 60000)) ||
    !(await consume(env.DB, "global-api", 10000, 86400000))
  )
    throw new HttpError(429, "Limite gratuito raggiunto. Riprova più tardi.");
  return key;
}
export async function limitAllocation(env: Env, key: string, size: number) {
  if (
    !(await consume(env.DB, `file-count:${key}`, 20, 3600000)) ||
    !(await consume(
      env.DB,
      `file-bytes:${key}`,
      25 * 1024 * 1024,
      86400000,
      size,
    )) ||
    !(await consume(
      env.DB,
      "global-file-bytes",
      150 * 1024 * 1024,
      86400000,
      size,
    ))
  )
    throw new HttpError(429, "Limite allegati raggiunto. Riprova più tardi.");
}
