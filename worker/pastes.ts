import type { Env, FileRow, FileReference, PasteRow } from "./types";
import { limitCreation } from "./rate-limit";
import {
  assert,
  hash,
  json,
  readJson,
  validBase64,
  validateId,
  validateToken,
} from "./http";
const TTL: Record<string, number> = {
  "1h": 3600000,
  "4h": 14400000,
  "1d": 86400000,
  "7d": 604800000,
};
export async function createPaste(request: Request, env: Env) {
  const b = await readJson(request, 400 * 1024);
  assert(validBase64(b.encryptedContent, 185000), "Testo cifrato non valido");
  assert(validBase64(b.iv, 16, 12), "IV non valido");
  assert(
    typeof b.hasPassword === "boolean" &&
      typeof b.burnAfterReading === "boolean",
    "Opzioni non valide",
  );
  const expiresIn = b.expiresIn ?? "7d";
  assert(
    typeof expiresIn === "string" && Object.hasOwn(TTL, expiresIn),
    "Scadenza non valida",
  );
  if (b.hasPassword) {
    assert(
      validBase64(b.passwordIv, 16, 12) && validBase64(b.salt, 24, 16),
      "Dati password non validi",
    );
  } else
    assert(b.passwordIv == null && b.salt == null, "Dati password incoerenti");
  assert(
    b.encryptedFiles === undefined || Array.isArray(b.encryptedFiles),
    "Allegati non validi",
  );
  const files = (b.encryptedFiles ?? []) as Record<string, unknown>[];
  assert(files.length <= 10, "Troppi allegati (max 10)");
  const ids = new Set<string>();
  let size = 0;
  const refs: (FileReference & { readTokenHash: string })[] = [];
  for (const entry of files) {
    assert(
      entry && typeof entry === "object" && typeof entry.fileId === "string",
      "Riferimento allegato non valido",
    );
    validateId(entry.fileId);
    assert(!ids.has(entry.fileId), "Allegato duplicato");
    ids.add(entry.fileId);
    validateToken(entry.readToken);
    assert(
      validBase64(entry.iv, 16, 12) &&
        validBase64(entry.metadataIv, 16, 12) &&
        validBase64(entry.encryptedMetadata, 8192),
      "Metadati cifrati non validi",
    );
    if (b.hasPassword)
      assert(
        validBase64(entry.passwordIv, 16, 12) &&
          validBase64(entry.passwordMetadataIv, 16, 12),
        "Dati password allegato mancanti",
      );
    else
      assert(
        entry.passwordIv == null && entry.passwordMetadataIv == null,
        "Dati password allegato incoerenti",
      );
    const readTokenHash = await hash(entry.readToken);
    const row = await env.DB.prepare(
      "SELECT * FROM File WHERE id=? AND readTokenHash=?",
    )
      .bind(entry.fileId, readTokenHash)
      .first<FileRow>();
    assert(
      row &&
        row.purpose === "paste" &&
        row.ready &&
        !row.parentId &&
        row.expiresAt > Date.now(),
      "Allegato non disponibile",
      409,
    );
    assert(
      entry.size === row.plainSize && row.layers === Number(b.hasPassword) + 1,
      "Dimensione o cifratura allegato incoerenti",
    );
    size += row.plainSize;
    refs.push({
      fileId: entry.fileId,
      readToken: entry.readToken,
      readTokenHash,
      iv: entry.iv,
      metadataIv: entry.metadataIv,
      encryptedMetadata: entry.encryptedMetadata,
      passwordIv: (entry.passwordIv as string) ?? null,
      passwordMetadataIv: (entry.passwordMetadataIv as string) ?? null,
      size: row.plainSize,
    });
  }
  assert(
    size <= 10 * 1024 * 1024 && b.fileSize === size,
    "Dimensione totale allegati non valida",
  );
  const id = crypto.randomUUID(),
    shortId = crypto.randomUUID().replaceAll("-", "").slice(0, 12),
    now = Date.now(),
    encryptedFiles = JSON.stringify(refs);
  const storedBytes =
    new TextEncoder().encode(b.encryptedContent + encryptedFiles).length + 4096;
  await limitCreation(env, "paste");
  await env.DB.prepare(
    "INSERT INTO Paste(id,shortId,encryptedContent,iv,passwordIv,salt,hasPassword,burnAfterReading,expiresAt,createdAt,encryptedFiles,storedBytes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      shortId,
      b.encryptedContent,
      b.iv,
      b.passwordIv ?? null,
      b.salt ?? null,
      Number(b.hasPassword),
      Number(b.burnAfterReading),
      now + TTL[expiresIn],
      now,
      encryptedFiles,
      storedBytes,
    )
    .run();
  return json({ id, shortId }, 201);
}
export async function getPaste(env: Env, id: string) {
  validateId(id);
  const now = Date.now();
  const r = await env.DB.batch([
    env.DB.prepare("DELETE FROM Paste WHERE id=? AND expiresAt<=?").bind(
      id,
      now,
    ),
    env.DB.prepare(
      "DELETE FROM Paste WHERE id=? AND burnAfterReading=1 AND expiresAt>? RETURNING *",
    ).bind(id, now),
    env.DB.prepare(
      "UPDATE Paste SET views=views+1 WHERE id=? AND burnAfterReading=0 AND expiresAt>? RETURNING *",
    ).bind(id, now),
  ]);
  const p = (r[1].results[0] ?? r[2].results[0]) as unknown as
    PasteRow | undefined;
  assert(p, "Paste non trovato o già eliminato", 404);
  const refs = JSON.parse(p.encryptedFiles).map(
    ({
      readTokenHash: _hash,
      ...ref
    }: FileReference & { readTokenHash: string }) => ref,
  );
  return json({
    encryptedContent: p.encryptedContent,
    iv: p.iv,
    passwordIv: p.passwordIv,
    salt: p.salt,
    hasPassword: !!p.hasPassword,
    burnAfterReading: !!p.burnAfterReading,
    expiresAt: new Date(p.expiresAt).toISOString(),
    encryptedFiles: refs,
  });
}
export async function shortPaste(env: Env, shortId: string) {
  validateId(shortId);
  const p = await env.DB.prepare(
    "SELECT id FROM Paste WHERE shortId=? AND expiresAt>?",
  )
    .bind(shortId, Date.now())
    .first();
  assert(p, "Paste non trovato", 404);
  return json(p);
}
