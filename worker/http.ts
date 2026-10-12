export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assert(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new HttpError(status, message);
}
export function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function readBytes(
  request: Request,
  max: number,
  contentType: string,
) {
  assert(
    request.headers.get("content-type")?.split(";")[0].trim() === contentType,
    "Content-Type non valido",
    415,
  );
  const declared = request.headers.get("content-length");
  if (declared !== null)
    assert(
      /^\d+$/.test(declared) && Number(declared) <= max,
      "Richiesta troppo grande",
      413,
    );
  const reader = request.body?.getReader();
  assert(reader, "Corpo mancante");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      total += r.value.byteLength;
      if (total > max) {
        await reader.cancel();
        throw new HttpError(413, "Richiesta troppo grande");
      }
      chunks.push(r.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of chunks) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}
export async function readJson(
  request: Request,
  max = 32768,
): Promise<Record<string, unknown>> {
  const bytes = await readBytes(request, max, "application/json");
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    assert(
      value && typeof value === "object" && !Array.isArray(value),
      "JSON non valido",
    );
    return value;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "JSON non valido");
  }
}
export function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export async function hash(value: string | Uint8Array) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function base64(bytes: Uint8Array) {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(
    "base64",
  );
}
export function validBase64(
  value: unknown,
  max: number,
  exact?: number,
): value is string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    !value.length ||
    !/^[A-Za-z0-9+/_-]+={0,2}$/.test(value) ||
    value.replace(/=+$/, "").length % 4 === 1
  )
    return false;
  const bare = value.replace(/=+$/, "");
  if (value.includes("=") && value.length % 4 !== 0) return false;
  const length = Math.floor((bare.length * 3) / 4);
  return exact === undefined ? length >= 16 : length === exact;
}
export function validateToken(value: unknown): asserts value is string {
  assert(
    typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value),
    "Token non valido",
    403,
  );
}
export function validateId(value: string) {
  assert(/^[a-zA-Z0-9_-]{1,100}$/.test(value), "ID non valido");
}
import { Buffer } from "node:buffer";
