import type { Env, FileRow } from "./types";
import {
  assert,
  base64,
  hash,
  HttpError,
  json,
  readBytes,
  readJson,
  token,
  validateToken,
} from "./http";
import {
  validAttachmentDeclaration,
  MAX_ATTACHMENT_BYTES,
} from "../lib/allowed-attachments";
import { limitAllocation } from "./rate-limit";
export const CHUNK_BYTES = 128 * 1024;
export const CHAT_TTLS = [30000, 60000, 120000, 300000, 600000];
export async function createFile(
  request: Request,
  env: Env,
  clientKey: string,
) {
  const b = await readJson(request, 4096);
  const { purpose, mimeType, extension, plainSize, size, layers, channelHash } =
    b;
  assert(purpose === "chat" || purpose === "paste", "Tipo allegato non valido");
  assert(
    validAttachmentDeclaration(mimeType, extension),
    "Formato allegato non consentito",
  );
  assert(
    Number.isInteger(plainSize) &&
      Number(plainSize) > 0 &&
      Number(plainSize) <= MAX_ATTACHMENT_BYTES,
    "Dimensione allegato non valida",
  );
  assert(layers === 1 || layers === 2, "Cifratura non valida");
  assert(purpose !== "chat" || layers === 1, "Cifratura chat non valida");
  const expected =
    layers === 2
      ? Math.ceil(((Number(plainSize) + 16) * 4) / 3) + 16
      : Number(plainSize) + 16;
  assert(size === expected, "Dimensione cifrata incoerente");
  const ttl = purpose === "chat" ? b.expiresInMs : 600000;
  assert(
    typeof ttl === "number" && CHAT_TTLS.includes(ttl),
    "Timer allegato non valido",
  );
  if (purpose === "chat")
    assert(
      typeof channelHash === "string" && /^[a-f0-9]{64}$/.test(channelHash),
      "Canale non valido",
    );
  await limitAllocation(env, clientKey, expected);
  const id = crypto.randomUUID(),
    uploadToken = token(),
    readToken = token(),
    now = Date.now(),
    chunks = Math.ceil(expected / CHUNK_BYTES);
  const storedBytes = Math.ceil(expected / 3) * 4 + chunks * 4 + 4096;
  await env.DB.prepare(
    "INSERT INTO File(id,purpose,channelHash,mimeType,extension,plainSize,size,chunks,layers,readTokenHash,uploadTokenHash,expiresInMs,expiresAt,createdAt,storedBytes,chunkBytes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      purpose,
      channelHash ?? null,
      mimeType,
      extension,
      plainSize,
      size,
      chunks,
      layers,
      await hash(readToken),
      await hash(uploadToken),
      ttl,
      now + 600000,
      now,
      storedBytes,
      CHUNK_BYTES,
    )
    .run();
  return json(
    {
      fileId: id,
      uploadToken,
      readToken,
      chunkBytes: CHUNK_BYTES,
      chunks,
      uploadExpiresAt: new Date(now + 600000).toISOString(),
    },
    201,
  );
}
async function authorizedFile(
  request: Request,
  env: Env,
  id: string,
  upload = false,
) {
  const value = request.headers.get(upload ? "X-Upload-Token" : "X-File-Token");
  validateToken(value);
  const f = await env.DB.prepare(
    `SELECT * FROM File WHERE id=? AND ${upload ? "uploadTokenHash" : "readTokenHash"}=?`,
  )
    .bind(id, await hash(value))
    .first<FileRow>();
  assert(f, "Allegato non trovato", 404);
  assert(f.expiresAt > Date.now(), "Allegato scaduto", 410);
  return f;
}
export async function uploadChunk(
  request: Request,
  env: Env,
  id: string,
  ordinal: number,
) {
  const f = await authorizedFile(request, env, id, true);
  assert(!f.ready, "Upload già concluso", 409);
  assert(
    Number.isInteger(ordinal) && ordinal >= 0 && ordinal < f.chunks,
    "Blocco non valido",
  );
  const digest = request.headers.get("X-Chunk-SHA256");
  assert(digest && /^[a-f0-9]{64}$/.test(digest), "Checksum non valido");
  const bytes = await readBytes(
    request,
    f.chunkBytes,
    "application/octet-stream",
  );
  assert(
    bytes.length === Math.min(f.chunkBytes, f.size - ordinal * f.chunkBytes),
    "Dimensione blocco incoerente",
  );
  assert((await hash(bytes)) === digest, "Checksum non corrispondente");
  const existing = await env.DB.prepare(
    "SELECT digest FROM FileChunk WHERE fileId=? AND ordinal=?",
  )
    .bind(id, ordinal)
    .first<{ digest: string }>();
  if (existing) {
    assert(
      existing.digest === digest,
      "Blocco già presente con contenuto differente",
      409,
    );
    return json({ success: true });
  }
  await env.DB.prepare(
    "INSERT INTO FileChunk(fileId,ordinal,content,bytes,digest) VALUES(?,?,?,?,?)",
  )
    .bind(id, ordinal, base64(bytes), bytes.length, digest)
    .run();
  return json({ success: true });
}
export async function completeFile(request: Request, env: Env, id: string) {
  const f = await authorizedFile(request, env, id, true);
  if (f.ready)
    return json({ fileId: id, expiresAt: new Date(f.expiresAt).toISOString() });
  const now = Date.now(),
    expiresAt = now + (f.purpose === "chat" ? f.expiresInMs : 600000);
  const row = await env.DB.prepare(
    "UPDATE File SET ready=1,expiresAt=? WHERE id=? AND ready=0 AND expiresAt>? AND (SELECT count(*) FROM FileChunk WHERE fileId=File.id)=chunks AND (SELECT sum(bytes) FROM FileChunk WHERE fileId=File.id)=size RETURNING id",
  )
    .bind(expiresAt, id, now)
    .first();
  assert(row, "Upload incompleto o scaduto", 409);
  return json({ fileId: id, expiresAt: new Date(expiresAt).toISOString() });
}
export async function fileInfo(request: Request, env: Env, id: string) {
  let f = await authorizedFile(request, env, id);
  assert(f.ready, "Upload incompleto", 409);
  let transferToken: string | undefined;
  if (f.burn) {
    transferToken = token();
    const row = await env.DB.prepare(
      "UPDATE File SET consumed=1,transferTokenHash=? WHERE id=? AND consumed=0 AND expiresAt>? RETURNING id",
    )
      .bind(await hash(transferToken), id, Date.now())
      .first();
    assert(row, "Allegato già letto", 410);
  }
  assert(f.expiresAt > Date.now(), "Allegato scaduto", 410);
  return json({
    fileId: id,
    size: f.size,
    chunks: f.chunks,
    chunkBytes: f.chunkBytes,
    expiresAt: new Date(f.expiresAt).toISOString(),
    transferToken,
    burn: !!f.burn,
  });
}
export async function downloadChunk(
  request: Request,
  env: Env,
  id: string,
  ordinal: number,
) {
  const f = await authorizedFile(request, env, id);
  assert(f.ready, "Upload incompleto", 409);
  assert(
    Number.isInteger(ordinal) && ordinal >= 0 && ordinal < f.chunks,
    "Blocco non valido",
  );
  if (f.burn) {
    const t = request.headers.get("X-Transfer-Token");
    validateToken(t);
    assert(
      f.transferTokenHash === (await hash(t)),
      "Download non autorizzato",
      403,
    );
  }
  const row = await env.DB.prepare(
    "SELECT content,digest,bytes FROM FileChunk WHERE fileId=? AND ordinal=?",
  )
    .bind(id, ordinal)
    .first<{ content: string; digest: string; bytes: number }>();
  assert(row, "Blocco mancante", 404);
  assert(f.expiresAt > Date.now(), "Allegato scaduto", 410);
  return new Response(row.content, {
    headers: {
      "Content-Type": "text/plain;charset=us-ascii",
      "Cache-Control": "no-store",
      "X-Chunk-SHA256": row.digest,
      "X-Chunk-Bytes": String(row.bytes),
      "X-Expires-At": new Date(f.expiresAt).toISOString(),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function deleteFile(request: Request, env: Env, id: string) {
  if (request.headers.has("X-Upload-Token")) {
    const f = await authorizedFile(request, env, id, true);
    assert(f.parentId === null, "Allegato già associato", 409);
    await env.DB.prepare("DELETE FROM File WHERE id=? AND parentId IS NULL")
      .bind(id)
      .run();
  } else {
    const f = await authorizedFile(request, env, id);
    const t = request.headers.get("X-Transfer-Token");
    validateToken(t);
    assert(
      f.burn && f.transferTokenHash === (await hash(t)),
      "Eliminazione non autorizzata",
      403,
    );
    await env.DB.prepare("DELETE FROM File WHERE id=?").bind(id).run();
  }
  return json({ success: true });
}
