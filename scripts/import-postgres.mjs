// Read-only on PostgreSQL. Writes only to the selected new D1 database. Never prints credentials or user content.
import pg from "pg";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "jsonc-parser";
import { d1 } from "./cloudflare-api.mjs";
const parseErrors = [];
const config = parse(readFileSync("wrangler.jsonc", "utf8"), parseErrors, {
  allowTrailingComma: true,
});
if (parseErrors.length) throw new Error("Configurazione Wrangler non valida");
const databaseId =
  process.env.PASTAA_D1_ID ?? config.d1_databases[0].database_id;
if (!process.env.DATABASE_URL)
  throw new Error(
    "Imposta DATABASE_URL tramite un file locale privato, senza incollarla in chat.",
  );
const sourceUrl = new URL(process.env.DATABASE_URL);
sourceUrl.searchParams.set("sslmode", "verify-full");
if (process.env.PGSSLROOTCERT)
  sourceUrl.searchParams.set("sslrootcert", process.env.PGSSLROOTCERT);
else if (
  sourceUrl.hostname.endsWith(".pooler.supabase.com") ||
  sourceUrl.hostname.endsWith(".supabase.co")
)
  sourceUrl.searchParams.set(
    "sslrootcert",
    fileURLToPath(new URL("./certificates/supabase-ca.pem", import.meta.url)),
  );
const client = new pg.Client({
  connectionString: sourceUrl.toString(),
  connectionTimeoutMillis: 15000,
  statement_timeout: 30000,
});
await client.connect();
const now = Date.now(),
  CHUNK = 512 * 1024,
  BUDGET = 200 * 1024 * 1024;
const sha = (value) => createHash("sha256").update(value).digest("hex");
const expiry = (value, max) =>
  value ? Math.min(new Date(value).getTime(), now + max) : now + max;
const filesFor = (p) => {
  if (p.encryptedFiles) return JSON.parse(p.encryptedFiles);
  if (p.encryptedFileContent)
    return [
      {
        encryptedContent: p.encryptedFileContent,
        iv: p.fileIv,
        encryptedMetadata: p.encryptedFileMetadata,
        metadataIv: p.fileMetadataIv,
        passwordIv: p.passwordFileIv,
        passwordMetadataIv: p.passwordFileMetadataIv,
        size: p.fileSize,
      },
    ];
  return [];
};
const statement = (sql, ...params) => ({ sql, params });
try {
  await client.query(
    "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
  );
  const pastes = (
    await client.query(
      'SELECT * FROM "Paste" WHERE "expiresAt" IS NULL OR "expiresAt" > now()',
    )
  ).rows;
  const pages = (
    await client.query(
      'SELECT * FROM "PublicPage" WHERE "expiresAt" IS NULL OR "expiresAt" > now()',
    )
  ).rows;
  await client.query("COMMIT");
  let estimate = 0;
  for (const p of pastes) {
    estimate += Buffer.byteLength(p.encryptedContent) + 16384;
    for (const f of filesFor(p)) {
      const n = Buffer.from(f.encryptedContent, "base64url").length;
      estimate += Math.ceil(n / 3) * 4 + Math.ceil(n / CHUNK) * 4 + 4096;
    }
  }
  for (const p of pages) estimate += Buffer.byteLength(p.content) + 4096;
  if (estimate > BUDGET)
    throw new Error(
      `I dati attivi superano il budget di 200 MiB (${Math.ceil(estimate / 1048576)} MiB). Nessun dato sorgente modificato.`,
    );
  const existing = (
    await d1(databaseId, [statement("SELECT id FROM Paste")])
  )[0].results;
  const imported = new Set(existing.map((p) => p.id));
  for (const p of pastes) {
    if (imported.has(p.id)) continue;
    const expiresAt = expiry(p.expiresAt, 604800000),
      refs = [];
    const queries = [];
    let plainTotal = 0;
    for (const [index, f] of filesFor(p).entries()) {
      const bytes = Buffer.from(f.encryptedContent, "base64url");
      const layers = p.hasPassword ? 2 : 1;
      const plainSize =
        f.size ||
        (layers === 1
          ? bytes.length - 16
          : Math.floor(((bytes.length - 16) * 3) / 4) - 16);
      if (plainSize <= 0 || plainSize > 10485760)
        throw new Error("Allegato legacy con dimensione non valida");
      plainTotal += plainSize;
      const fileId = sha(`pastaa-migration:${p.id}:${index}`).slice(0, 32),
        readToken = randomBytes(32).toString("base64url"),
        uploadToken = randomBytes(32).toString("base64url"),
        chunks = Math.ceil(bytes.length / CHUNK);
      queries.push(
        statement("DELETE FROM File WHERE id=? AND parentId IS NULL", fileId),
      );
      queries.push(
        statement(
          "INSERT INTO File(id,purpose,mimeType,extension,plainSize,size,chunks,layers,readTokenHash,uploadTokenHash,expiresInMs,expiresAt,createdAt,storedBytes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          fileId,
          "paste",
          "application/octet-stream",
          "bin",
          plainSize,
          bytes.length,
          chunks,
          layers,
          sha(readToken),
          sha(uploadToken),
          600000,
          now + 600000,
          now,
          Math.ceil(bytes.length / 3) * 4 + chunks * 4 + 4096,
        ),
      );
      for (
        let offset = 0, ordinal = 0;
        offset < bytes.length;
        offset += CHUNK, ordinal++
      ) {
        const part = bytes.subarray(offset, offset + CHUNK);
        queries.push(
          statement(
            "INSERT INTO FileChunk(fileId,ordinal,content,bytes,digest) VALUES(?,?,?,?,?)",
            fileId,
            ordinal,
            part.toString("base64"),
            part.length,
            sha(part),
          ),
        );
      }
      queries.push(statement("UPDATE File SET ready=1 WHERE id=?", fileId));
      refs.push({
        fileId,
        readToken,
        readTokenHash: sha(readToken),
        iv: f.iv,
        metadataIv: f.metadataIv,
        encryptedMetadata: f.encryptedMetadata,
        passwordIv: f.passwordIv ?? null,
        passwordMetadataIv: f.passwordMetadataIv ?? null,
        size: plainSize,
      });
    }
    if (plainTotal > 10485760 || refs.length > 10)
      throw new Error("Limite allegati legacy superato");
    const encryptedFiles = JSON.stringify(refs);
    queries.push(
      statement(
        "INSERT INTO Paste(id,shortId,encryptedContent,iv,passwordIv,salt,hasPassword,burnAfterReading,expiresAt,createdAt,views,encryptedFiles,storedBytes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        p.id,
        p.shortId,
        p.encryptedContent,
        p.iv,
        p.passwordIv ?? null,
        p.salt ?? null,
        Number(p.hasPassword),
        Number(p.burnAfterReading),
        expiresAt,
        new Date(p.createdAt).getTime(),
        p.views,
        encryptedFiles,
        Buffer.byteLength(p.encryptedContent + encryptedFiles) + 4096,
      ),
    );
    // Keep each API request below 50 statements. Incomplete tickets expire if the import is interrupted.
    for (let start = 0; start < queries.length; start += 40)
      await d1(databaseId, queries.slice(start, start + 40));
  }
  for (const p of pages) {
    const size = Buffer.byteLength(p.content);
    if (size > 102400)
      throw new Error("Pagina legacy oltre il limite di 100 KiB");
    await d1(databaseId, [
      statement(
        "INSERT INTO PublicPage(id,content,expiresAt,createdAt,updatedAt,storedBytes) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content,expiresAt=excluded.expiresAt,updatedAt=excluded.updatedAt,storedBytes=excluded.storedBytes WHERE PublicPage.updatedAt<=excluded.updatedAt",
        p.id,
        p.content,
        expiry(p.expiresAt, 2592000000),
        new Date(p.createdAt).getTime(),
        new Date(p.updatedAt).getTime(),
        size + 4096,
      ),
    ]);
  }
  const counts = (
    await d1(databaseId, [
      statement(
        "SELECT (SELECT count(*) FROM Paste) AS pastes,(SELECT count(*) FROM PublicPage) AS pages,(SELECT used FROM StorageBudget WHERE id=1) AS bytes",
      ),
    ])
  )[0].results[0];
  console.log(
    JSON.stringify({
      source: { pastes: pastes.length, pages: pages.length },
      destination: counts,
    }),
  );
} finally {
  await client.end();
}
