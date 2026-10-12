import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import worker from "../worker/index";
import { cleanup } from "../worker/cleanup";
import { hash, base64 } from "../worker/http";
import { CHUNK_BYTES } from "../worker/files";
import { validateAttachmentBytes } from "../lib/allowed-attachments";
import {
  encryptBytes,
  encryptText,
  generateKey,
  decryptText,
} from "../lib/crypto";
import { issueAccessToken, cookieName, ACCESS_TTL_MS } from "../worker/access";
import { CREATION_LIMITS } from "../worker/rate-limit";
const bytesFromBase64 = (value: string) =>
  new Uint8Array(Buffer.from(value, "base64"));
import type { Env } from "../worker/types";
let mf: Miniflare, env: Env;
const cookies = new Map<string, string>();
function limiter(limit: number): RateLimit {
  const counters = new Map<string, number>();
  return {
    limit: async ({ key }: { key: string }) => {
      const bucket = `${key}:${Math.floor(Date.now() / 60000)}`;
      const count = (counters.get(bucket) ?? 0) + 1;
      counters.set(bucket, count);
      return { success: count <= limit };
    },
  } as RateLimit;
}
before(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: "test",
          modules: true,
          script: 'export default { fetch() { return new Response("ok"); } }',
          compatibilityDate: "2026-10-12",
          d1Databases: ["DB"],
        },
      ],
    }),
  );
  const DB = await mf.getD1Database("DB", "test");
  for (const migration of ["0001_cloudflare.sql", "0002_small_chunks.sql"]) {
    const schema = await readFile(
      new URL(`../migrations/${migration}`, import.meta.url),
      "utf8",
    );
    for (const statement of schema
      .replace(/--[^\n]*/g, "")
      .split(/(?=^(?:PRAGMA |CREATE |INSERT |ALTER |DROP))/m)
      .filter((s) => s.trim()))
      await DB.prepare(statement.trim()).run();
  }
  env = {
    DB,
    ASSETS: { fetch: async () => new Response("static") } as unknown as Fetcher,
    APP_URL: "https://pastaa.io",
    RATE_LIMIT_SECRET: "test-secret-that-is-at-least-32-characters",
    TURNSTILE_SECRET_KEY: "test-only-siteverify-secret",
    API_LIMITER: limiter(360),
    ACCESS_LIMITER: limiter(6),
    SESSION_LIMITER: limiter(360),
    WRITE_LIMITER: limiter(30),
  };
});
after(async () => {
  await mf?.dispose();
});
beforeEach(async () => {
  cookies.clear();
  env.API_LIMITER = limiter(360);
  env.ACCESS_LIMITER = limiter(6);
  env.SESSION_LIMITER = limiter(360);
  env.WRITE_LIMITER = limiter(30);
  await env.DB.batch(
    [
      "DELETE FROM Paste",
      "DELETE FROM File",
      "DELETE FROM PublicPage",
      "DELETE FROM RateLimit",
      "UPDATE StorageBudget SET used=0 WHERE id=1",
    ].map((sql) => env.DB.prepare(sql)),
  );
});
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const h: Record<string, string> = {
    "CF-Connecting-IP": "192.0.2.42",
    Origin: "https://pastaa.io",
    ...headers,
  };
  const identity = `${h["CF-Connecting-IP"]}:${h["User-Agent"] ?? ""}`;
  if (!("Cookie" in h)) {
    if (!cookies.has(identity)) {
      const access = await issueAccessToken(
        new Request("https://pastaa.io/api/access", { headers: h }),
        env,
      );
      cookies.set(identity, `${cookieName(env)}=${access.value}`);
    }
    h.Cookie = cookies.get(identity)!;
  }
  const raw = body instanceof Uint8Array;
  if (body !== undefined)
    h["Content-Type" as keyof typeof h] = raw
      ? "application/octet-stream"
      : "application/json";
  return worker.fetch(
    new Request(`https://pastaa.io${path}`, {
      method,
      headers: h,
      body:
        body === undefined
          ? undefined
          : raw
            ? (body as BodyInit)
            : JSON.stringify(body),
    }),
    env,
  );
}
async function data(response: Response): Promise<any> {
  return response.json();
}
async function makeFile(
  purpose = "chat",
  plainSize = 24,
  extra: Record<string, unknown> = {},
) {
  const response = await request("/api/files", "POST", {
    purpose,
    mimeType: "text/plain",
    extension: "txt",
    plainSize,
    size: plainSize + 16,
    layers: 1,
    channelHash: "a".repeat(64),
    expiresInMs: 30000,
    ...extra,
  });
  assert.equal(
    response.status,
    201,
    JSON.stringify(await response.clone().json()),
  );
  return data(response);
}
async function putFile(ticket: any, bytes: Uint8Array) {
  for (
    let offset = 0, ordinal = 0;
    offset < bytes.length;
    offset += CHUNK_BYTES, ordinal++
  ) {
    const chunk = bytes.slice(offset, offset + CHUNK_BYTES);
    const r = await request(
      `/api/files/${ticket.fileId}/chunks/${ordinal}`,
      "PUT",
      chunk,
      {
        "X-Upload-Token": ticket.uploadToken,
        "X-Chunk-SHA256": await hash(chunk),
      },
    );
    assert.equal(r.status, 200, JSON.stringify(await r.clone().json()));
  }
  const r = await request(
    `/api/files/${ticket.fileId}/complete`,
    "POST",
    undefined,
    { "X-Upload-Token": ticket.uploadToken },
  );
  assert.equal(r.status, 200);
  return data(r);
}
async function pasteBody() {
  const key = await generateKey();
  const e = await encryptText("messaggio privato", key);
  return {
    key,
    body: {
      ...e,
      hasPassword: false,
      passwordIv: null,
      salt: null,
      burnAfterReading: false,
      expiresIn: "1h",
      encryptedFiles: [],
      fileSize: 0,
    },
  };
}
test("migration freeze blocks reads and writes before data access", async () => {
  env.MIGRATION_FREEZE = "1";
  try {
    for (const [path, method] of [
      ["/api/health", "GET"],
      ["/api/paste", "POST"],
    ]) {
      const r = await request(path, method);
      assert.equal(r.status, 503);
      assert.equal(r.headers.get("Retry-After"), "30");
    }
    assert.equal(
      await env.DB.prepare("SELECT count(*) AS n FROM RateLimit").first("n"),
      0,
    );
  } finally {
    delete env.MIGRATION_FREEZE;
  }
});
test("encrypted text and existing URL format round trip without server plaintext", async () => {
  const { key, body } = await pasteBody();
  const created = await request("/api/paste", "POST", body);
  assert.equal(created.status, 201);
  const ids = await data(created);
  assert.equal((await request(`/api/paste/short/${ids.shortId}`)).status, 200);
  const r = await request(`/api/paste/${ids.id}`);
  const p = await data(r);
  assert.equal(r.status, 200);
  assert.equal(
    await decryptText(p.encryptedContent, p.iv, key),
    "messaggio privato",
  );
  assert.equal(r.headers.get("Cache-Control"), "no-store");
  assert.equal(
    (
      await env.DB.prepare("SELECT encryptedContent FROM Paste WHERE id=?")
        .bind(ids.id)
        .first<any>()
    )?.encryptedContent,
    body.encryptedContent,
  );
});
test("burn-after-reading permits one winner under concurrent reads", async () => {
  const { body } = await pasteBody();
  body.burnAfterReading = true;
  const ids = await data(await request("/api/paste", "POST", body));
  const results = await Promise.all([
    request(`/api/paste/${ids.id}`),
    request(`/api/paste/${ids.id}`),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 404]);
  assert.equal(await env.DB.prepare("SELECT id FROM Paste").first(), null);
});
test("expired paste cannot be read before the scheduled cleanup runs", async () => {
  const { body } = await pasteBody();
  const ids = await data(await request("/api/paste", "POST", body));
  await env.DB.prepare("UPDATE Paste SET expiresAt=? WHERE id=?")
    .bind(Date.now() - 1, ids.id)
    .run();
  assert.equal((await request(`/api/paste/${ids.id}`)).status, 404);
});
test("file upload rejects forbidden formats, false size and invalid expiry", async () => {
  for (const override of [
    { mimeType: "application/zip", extension: "zip" },
    { mimeType: "image/png", extension: "exe" },
    { plainSize: 0 },
    { plainSize: 10485761 },
    { size: 600 },
    { expiresInMs: -1 },
    { expiresInMs: 999999999 },
    { layers: 2 },
  ]) {
    const r = await request("/api/files", "POST", {
      purpose: "chat",
      mimeType: "text/plain",
      extension: "txt",
      plainSize: 24,
      size: 40,
      layers: 1,
      channelHash: "a".repeat(64),
      expiresInMs: 30000,
      ...override,
    });
    assert.equal(r.status, 400, JSON.stringify(override));
  }
  assert.equal(await env.DB.prepare("SELECT id FROM File").first(), null);
});
test("upload enforces actual streamed bytes, ownership, digest, ordinal and completeness", async () => {
  const f = await makeFile();
  const bytes = new Uint8Array(40).fill(7),
    headers = {
      "X-Upload-Token": f.uploadToken,
      "X-Chunk-SHA256": await hash(bytes),
    };
  assert.equal(
    (
      await request(`/api/files/${f.fileId}/complete`, "POST", undefined, {
        "X-Upload-Token": f.uploadToken,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/api/files/${f.fileId}/chunks/0`, "PUT", bytes, {
        "X-Upload-Token": "x".repeat(43),
        "X-Chunk-SHA256": await hash(bytes),
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(`/api/files/${f.fileId}/chunks/0`, "PUT", bytes, {
        ...headers,
        "X-Chunk-SHA256": "0".repeat(64),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        `/api/files/${f.fileId}/chunks/0`,
        "PUT",
        bytes.slice(1),
        headers,
      )
    ).status,
    400,
  );
  assert.equal(
    (await request(`/api/files/${f.fileId}/chunks/1`, "PUT", bytes, headers))
      .status,
    400,
  );
  assert.equal(
    (
      await request(
        `/api/files/${f.fileId}/chunks/0`,
        "PUT",
        new Uint8Array(CHUNK_BYTES + 1),
        { ...headers, "Content-Length": "1" },
      )
    ).status,
    413,
  );
  await putFile(f, bytes);
  assert.equal((await request(`/api/files/${f.fileId}`)).status, 403);
  const meta = await data(
    await request(`/api/files/${f.fileId}`, "GET", undefined, {
      "X-File-Token": f.readToken,
    }),
  );
  assert.equal(meta.size, 40);
  const chunk = await request(
    `/api/files/${f.fileId}/chunks/0`,
    "GET",
    undefined,
    { "X-File-Token": f.readToken },
  );
  assert.equal(await chunk.text(), base64(bytes));
  assert.equal(chunk.headers.get("X-Chunk-SHA256"), await hash(bytes));
});
test("timer starts at completion; expiry denies every chunk even before physical deletion", async () => {
  const f = await makeFile();
  const complete = await putFile(f, new Uint8Array(40));
  assert.ok(Date.parse(complete.expiresAt) > Date.now() + 28000);
  await env.DB.prepare("UPDATE File SET expiresAt=? WHERE id=?")
    .bind(Date.now() - 1, f.fileId)
    .run();
  for (const path of [
    `/api/files/${f.fileId}`,
    `/api/files/${f.fileId}/chunks/0`,
  ])
    assert.equal(
      (await request(path, "GET", undefined, { "X-File-Token": f.readToken }))
        .status,
      410,
    );
});
test("scheduled deletion removes unvisited files, chunks, pastes, pages and releases reserved storage", async () => {
  const f = await makeFile();
  await putFile(f, new Uint8Array(40));
  const { body } = await pasteBody();
  await request("/api/paste", "POST", body);
  await request("/api/public-page", "POST", {
    id: "expiry-test",
    content: "old",
  });
  const old = Date.now() - 1000;
  await env.DB.batch([
    env.DB.prepare("UPDATE File SET expiresAt=?").bind(old),
    env.DB.prepare("UPDATE Paste SET expiresAt=?").bind(old),
    env.DB.prepare("UPDATE PublicPage SET expiresAt=?").bind(old),
  ]);
  await cleanup(env);
  for (const table of ["Paste", "File", "FileChunk", "PublicPage"])
    assert.equal(
      await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first("n"),
      0,
    );
  assert.equal(
    await env.DB.prepare("SELECT used FROM StorageBudget").first("used"),
    0,
  );
});
test("budget cap fails closed and concurrent attachments cannot be assigned twice", async () => {
  await env.DB.prepare("UPDATE StorageBudget SET used=209715200").run();
  const denied = await request("/api/files", "POST", {
    purpose: "chat",
    mimeType: "text/plain",
    extension: "txt",
    plainSize: 24,
    size: 40,
    layers: 1,
    channelHash: "a".repeat(64),
    expiresInMs: 30000,
  });
  assert.equal(denied.status, 507);
  assert.equal(await env.DB.prepare("SELECT id FROM File").first(), null);
  await env.DB.prepare("UPDATE StorageBudget SET used=0").run();
  const f = await makeFile("paste");
  await putFile(f, new Uint8Array(40));
  const { body } = await pasteBody();
  const meta = await encryptText(
    '{"name":"f.txt","type":"text/plain","size":24}',
    await generateKey(),
  );
  Object.assign(body, {
    fileSize: 24,
    encryptedFiles: [
      {
        fileId: f.fileId,
        readToken: f.readToken,
        iv: body.iv,
        encryptedMetadata: meta.encryptedContent,
        metadataIv: meta.iv,
        size: 24,
      },
    ],
  });
  const responses = await Promise.all([
    request("/api/paste", "POST", body),
    request("/api/paste", "POST", body),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  assert.equal(
    await env.DB.prepare("SELECT count(*) AS n FROM Paste").first("n"),
    1,
  );
});
test("content sniffing rejects executable/renamed files before encryption and after decryption", async () => {
  await assert.rejects(
    validateAttachmentBytes(
      "photo.png",
      "image/png",
      new Uint8Array([77, 90, 0, 1]),
    ),
  );
  await assert.rejects(
    validateAttachmentBytes(
      "../f.txt",
      "text/plain",
      new TextEncoder().encode("hello"),
    ),
  );
  await assert.rejects(
    validateAttachmentBytes(
      "fake.pdf",
      "application/pdf",
      new TextEncoder().encode("hello"),
    ),
  );
  await assert.rejects(
    validateAttachmentBytes(
      "binary.txt",
      "text/plain",
      new Uint8Array([255, 0, 8]),
    ),
  );
  await validateAttachmentBytes(
    "safe.txt",
    "text/plain",
    new TextEncoder().encode("hello"),
  );
  await validateAttachmentBytes(
    "safe.pdf",
    "application/pdf",
    new TextEncoder().encode("%PDF-1.7\n%%EOF\n"),
  );
});
test("IP quota and foreign origins are enforced", async (t) => {
  const fixedNow = Date.now();
  t.mock.method(Date, "now", () => fixedNow);
  assert.equal(
    (
      await request(
        "/api/files",
        "POST",
        {},
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  for (let n = 0; n < 360; n++)
    assert.equal((await request("/api/health")).status, 200);
  assert.equal((await request("/api/health")).status, 429);
});

test("password-protected maximum-size encrypted attachments fit chunk rows and preserve all bytes", async () => {
  const plainSize = 10 * 1024 * 1024;
  const key = await generateKey();
  const cipher = await encryptBytes(new Uint8Array(plainSize).buffer, key);
  const second = await encryptText(cipher.encryptedContent, key);
  const bytes = bytesFromBase64(second.encryptedContent);
  const f = await makeFile("paste", plainSize, {
    size: bytes.length,
    layers: 2,
  });
  await putFile(f, bytes);
  const headers = { "X-File-Token": f.readToken };
  const info = await data(
    await request(`/api/files/${f.fileId}`, "GET", undefined, headers),
  );
  assert.equal(info.chunks, Math.ceil(bytes.length / CHUNK_BYTES));
  for (let n = 0; n < info.chunks; n++) {
    const response = await request(
      `/api/files/${f.fileId}/chunks/${n}`,
      "GET",
      undefined,
      headers,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(
      bytesFromBase64(await response.text()),
      bytes.subarray(n * CHUNK_BYTES, (n + 1) * CHUNK_BYTES),
    );
  }
});
test("burning a paste retains only a single bounded attachment transfer, then cascades deletion", async () => {
  const f = await makeFile("paste");
  await putFile(f, new Uint8Array(40));
  const { body } = await pasteBody();
  const metadata = await encryptText("metadata", await generateKey());
  Object.assign(body, {
    burnAfterReading: true,
    fileSize: 24,
    encryptedFiles: [
      {
        fileId: f.fileId,
        readToken: f.readToken,
        iv: body.iv,
        metadataIv: metadata.iv,
        encryptedMetadata: metadata.encryptedContent,
        size: 24,
      },
    ],
  });
  const created = await data(await request("/api/paste", "POST", body));
  assert.equal((await request(`/api/paste/${created.id}`)).status, 200);
  const headers = { "X-File-Token": f.readToken };
  const first = await data(
    await request(`/api/files/${f.fileId}`, "GET", undefined, headers),
  );
  assert.ok(first.transferToken);
  assert.ok(Date.parse(first.expiresAt) <= Date.now() + 120000);
  assert.equal(
    (await request(`/api/files/${f.fileId}`, "GET", undefined, headers)).status,
    410,
  );
  assert.equal(
    (
      await request(
        `/api/files/${f.fileId}/chunks/0`,
        "GET",
        undefined,
        headers,
      )
    ).status,
    403,
  );
  headers["X-Transfer-Token" as keyof typeof headers] = first.transferToken;
  assert.equal(
    (
      await request(
        `/api/files/${f.fileId}/chunks/0`,
        "GET",
        undefined,
        headers,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request(`/api/files/${f.fileId}`, "DELETE", undefined, headers))
      .status,
    200,
  );
  assert.equal(await env.DB.prepare("SELECT id FROM File").first(), null);
  assert.equal(
    await env.DB.prepare("SELECT count(*) AS n FROM FileChunk").first("n"),
    0,
  );
  assert.equal(
    await env.DB.prepare("SELECT used FROM StorageBudget").first("used"),
    0,
  );
});

test("distributed requests without verified sessions never access D1", async (t) => {
  let dbCalls = 0;
  const original = env.DB;
  env.DB = new Proxy(original, {
    get(target, prop) {
      if (prop === "prepare" || prop === "batch")
        return () => {
          dbCalls++;
          throw new Error("Unverified database access");
        };
      return Reflect.get(target, prop);
    },
  });
  t.after(() => {
    env.DB = original;
  });
  for (let n = 1; n <= 80; n++) {
    const headers = { Cookie: "", "CF-Connecting-IP": `198.51.100.${n}` };
    assert.equal(
      (
        await request(
          "/api/files",
          "POST",
          { plainSize: 1024 * 1024 * 1024 },
          headers,
        )
      ).status,
      401,
    );
    assert.equal(
      (await request("/api/paste/missing", "GET", undefined, headers)).status,
      401,
    );
    assert.equal(
      (await request("/api/chat/auth", "POST", {}, headers)).status,
      401,
    );
  }
  assert.equal(dbCalls, 0);
});

test("signed access expires and cannot be forged or reused from another IP, browser or host", async () => {
  const baseHeaders = {
    "CF-Connecting-IP": "192.0.2.42",
    Origin: "https://pastaa.io",
    "User-Agent": "test-browser",
  };
  const issued = await issueAccessToken(
    new Request("https://pastaa.io/api/access", { headers: baseHeaders }),
    env,
  );
  const headers = {
    ...baseHeaders,
    Cookie: `${cookieName(env)}=${issued.value}`,
  };
  assert.equal(
    (await request("/api/health", "GET", undefined, headers)).status,
    200,
  );
  assert.equal(
    (
      await request("/api/health", "GET", undefined, {
        ...headers,
        "CF-Connecting-IP": "192.0.2.43",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/api/health", "GET", undefined, {
        ...headers,
        "User-Agent": "other-browser",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/api/health", "GET", undefined, {
        ...headers,
        Cookie:
          headers.Cookie.replace(
            /^([^=]+=1\.)\d+/,
            `$1${Date.now() + ACCESS_TTL_MS}`,
          ) + "x",
      })
    ).status,
    401,
  );
  for (const expiry of [Date.now() - 1, Date.now() + ACCESS_TTL_MS * 2]) {
    const invalid = await issueAccessToken(
      new Request("https://pastaa.io/api/access", { headers: baseHeaders }),
      env,
      expiry,
    );
    assert.equal(
      (
        await request("/api/health", "GET", undefined, {
          ...headers,
          Cookie: `${cookieName(env)}=${invalid.value}`,
        })
      ).status,
      401,
    );
  }
  assert.equal(
    (
      await worker.fetch(
        new Request("https://pastaa.pastaa.workers.dev/api/health", {
          headers,
        }),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://chat.pastaa.io/api/health", {
          headers: { ...headers, Origin: "https://chat.pastaa.io" },
        }),
        env,
      )
    ).status,
    401,
  );
  assert.equal(
    (await request("/api/paste", "POST", {}, { ...headers, Origin: "" }))
      .status,
    403,
  );
  assert.equal(
    (
      await request("/api/health", "GET", undefined, {
        ...headers,
        "Sec-Fetch-Site": "cross-site",
      })
    ).status,
    403,
  );
});

test("burst and creation limits reject requests before database access", async (t) => {
  env.WRITE_LIMITER = limiter(1);
  assert.equal((await makeFile()).fileId.length > 0, true);
  let dbCalls = 0;
  const original = env.DB;
  env.DB = new Proxy(original, {
    get(target, prop) {
      if (prop === "prepare")
        return () => {
          dbCalls++;
          throw new Error("Database access after rejection");
        };
      return Reflect.get(target, prop);
    },
  });
  t.after(() => {
    env.DB = original;
  });
  assert.equal((await request("/api/files", "POST", {})).status, 429);
  env.API_LIMITER = limiter(0);
  assert.equal((await request("/api/health")).status, 429);
  assert.equal(dbCalls, 0);
});

test("access handshake verifies Turnstile hostname/action, fails closed and issues a protected cookie", async (t) => {
  let result: unknown = { success: false };
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, options: RequestInit) => {
      assert.equal(
        url,
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      );
      const body = options.body as URLSearchParams;
      assert.equal(body.get("response"), "test-turnstile-token");
      assert.equal(body.get("remoteip"), "192.0.2.42");
      calls++;
      return Response.json(result);
    },
  );
  assert.equal(
    (await request("/api/access", "POST", {}, { Cookie: "" })).status,
    400,
  );
  for (const value of [
    { success: false },
    { success: true, hostname: "evil.example", action: "pastaa-access" },
    { success: true, hostname: "pastaa.io", action: "email" },
  ]) {
    result = value;
    assert.equal(
      (
        await request(
          "/api/access",
          "POST",
          { token: "test-turnstile-token" },
          { Cookie: "" },
        )
      ).status,
      403,
    );
  }
  result = { success: true, hostname: "pastaa.io", action: "pastaa-access" };
  const response = await request(
    "/api/access",
    "POST",
    { token: "test-turnstile-token" },
    { Cookie: "" },
  );
  assert.equal(response.status, 200);
  const cookie = response.headers.get("Set-Cookie")!;
  assert.match(cookie, /^__Host-pastaa_access=/);
  assert.match(cookie, /; HttpOnly; SameSite=Strict; Secure$/);
  assert.equal(
    (
      await request("/api/health", "GET", undefined, {
        Cookie: cookie.split(";")[0],
      })
    ).status,
    200,
  );
  assert.equal(calls, 4);
});

test("daily creation budgets resist IP rotation and deletion while preserving existing page updates", async () => {
  const bucket = Math.floor(Date.now() / 86400000);
  const expiry = (bucket + 1) * 86400000;
  await env.DB.prepare(
    "INSERT INTO RateLimit(key,count,expiresAt) VALUES(?,?,?)",
  )
    .bind(`global-create-file:${bucket}`, CREATION_LIMITS.file - 1, expiry)
    .run();
  const f = await makeFile();
  assert.equal(
    (
      await request(`/api/files/${f.fileId}`, "DELETE", undefined, {
        "X-Upload-Token": f.uploadToken,
      })
    ).status,
    200,
  );
  const declaration = {
    purpose: "chat",
    mimeType: "text/plain",
    extension: "txt",
    plainSize: 1,
    size: 17,
    layers: 1,
    channelHash: "a".repeat(64),
    expiresInMs: 60000,
  };
  assert.equal(
    (
      await request("/api/files", "POST", declaration, {
        "CF-Connecting-IP": "198.51.100.10",
      })
    ).status,
    429,
  );
  assert.equal(
    (
      await request("/api/files", "POST", declaration, {
        "CF-Connecting-IP": "198.51.100.11",
      })
    ).status,
    429,
  );
  const stored = await env.DB.prepare("SELECT count FROM RateLimit WHERE key=?")
    .bind(`global-create-file:${bucket}`)
    .first<{ count: number }>();
  assert.equal(stored!.count, CREATION_LIMITS.file);

  assert.equal(
    (
      await request("/api/public-page", "POST", {
        id: "existing-page",
        content: "first",
        expiresIn: 3600000,
      })
    ).status,
    200,
  );
  await env.DB.prepare("UPDATE RateLimit SET count=? WHERE key=?")
    .bind(CREATION_LIMITS.page, `global-create-page:${bucket}`)
    .run();
  assert.equal(
    (
      await request(
        "/api/public-page",
        "POST",
        { id: "new-page", content: "new", expiresIn: 3600000 },
        { "CF-Connecting-IP": "198.51.100.12" },
      )
    ).status,
    429,
  );
  assert.equal(
    (
      await request("/api/public-page", "POST", {
        id: "existing-page",
        content: "updated",
        expiresIn: 3600000,
      })
    ).status,
    200,
  );
  assert.equal(
    (await data(await request("/api/public-page?id=existing-page"))).content,
    "updated",
  );
  await env.DB.prepare(
    "INSERT INTO RateLimit(key,count,expiresAt) VALUES(?,?,?)",
  )
    .bind(`global-create-paste:${bucket}`, CREATION_LIMITS.paste, expiry)
    .run();
  const { body } = await pasteBody();
  assert.equal(
    (
      await request("/api/paste", "POST", body, {
        "CF-Connecting-IP": "198.51.100.13",
      })
    ).status,
    429,
  );
  assert.equal(
    (
      await request("/api/paste", "POST", body, {
        "CF-Connecting-IP": "198.51.100.14",
      })
    ).status,
    429,
  );
});
