import type { Env } from "./types";
import { assert, json, readJson, validateId } from "./http";
import { limitCreation } from "./rate-limit";
const DURATIONS = [
  3600000, 14400000, 21600000, 86400000, 604800000, 2592000000,
];
export async function getPage(env: Env, id: string) {
  validateId(id);
  const page = await env.DB.prepare(
    "SELECT * FROM PublicPage WHERE id=? AND expiresAt>?",
  )
    .bind(id, Date.now())
    .first<{
      id: string;
      content: string;
      updatedAt: number;
      expiresAt: number;
    }>();
  return json(
    page
      ? {
          ...page,
          exists: true,
          updatedAt: new Date(page.updatedAt).toISOString(),
          expiresAt: new Date(page.expiresAt).toISOString(),
        }
      : { id, content: "", exists: false },
  );
}
export async function savePage(request: Request, env: Env) {
  const b = await readJson(request, 115 * 1024);
  assert(
    typeof b.id === "string" && typeof b.content === "string",
    "Pagina non valida",
  );
  validateId(b.id);
  const size = new TextEncoder().encode(b.content).length;
  assert(size <= 100 * 1024, "Contenuto troppo grande", 413);
  const duration = b.updateExpiration ?? b.expiresIn ?? 86400000;
  assert(
    typeof duration === "number" && DURATIONS.includes(duration),
    "Scadenza non valida (max 30 giorni)",
  );
  const now = Date.now(),
    explicit = b.updateExpiration !== undefined;
  const existing = await env.DB.prepare("SELECT id FROM PublicPage WHERE id=?")
    .bind(b.id)
    .first();
  if (!existing) await limitCreation(env, "page");
  const page = await env.DB.prepare(
    "INSERT INTO PublicPage(id,content,expiresAt,createdAt,updatedAt,storedBytes) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content,expiresAt=CASE WHEN PublicPage.expiresAt<=? OR ?=1 THEN excluded.expiresAt ELSE PublicPage.expiresAt END,updatedAt=excluded.updatedAt,storedBytes=excluded.storedBytes RETURNING *",
  )
    .bind(
      b.id,
      b.content,
      now + duration,
      now,
      now,
      size + 4096,
      now,
      Number(explicit),
    )
    .first<{ id: string; updatedAt: number; expiresAt: number }>();
  return json({
    success: true,
    id: page!.id,
    updatedAt: new Date(page!.updatedAt).toISOString(),
    expiresAt: new Date(page!.expiresAt).toISOString(),
  });
}
