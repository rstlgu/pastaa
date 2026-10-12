import type { Env } from "./types";
export async function cleanup(env: Env, now = Date.now()) {
  // Indexed, bounded deletes. D1 batches roll back together, including budget triggers and chunk cascades.
  return env.DB.batch([
    env.DB.prepare(
      "DELETE FROM File WHERE id IN (SELECT id FROM File WHERE expiresAt<=? ORDER BY expiresAt LIMIT 100)",
    ).bind(now),
    env.DB.prepare(
      "DELETE FROM File WHERE parentId IN (SELECT id FROM Paste WHERE expiresAt<=? ORDER BY expiresAt LIMIT 100)",
    ).bind(now),
    env.DB.prepare(
      "DELETE FROM Paste WHERE id IN (SELECT id FROM Paste WHERE expiresAt<=? ORDER BY expiresAt LIMIT 100)",
    ).bind(now),
    env.DB.prepare(
      "DELETE FROM PublicPage WHERE id IN (SELECT id FROM PublicPage WHERE expiresAt<=? ORDER BY expiresAt LIMIT 100)",
    ).bind(now),
    env.DB.prepare(
      "DELETE FROM RateLimit WHERE key IN (SELECT key FROM RateLimit WHERE expiresAt<=? ORDER BY expiresAt LIMIT 200)",
    ).bind(now),
  ]);
}
