import { apiFetch } from "./api-fetch";
import { attachmentExtension, attachmentMime } from "./allowed-attachments";
const CHUNK_BYTES = 128 * 1024;
export interface StoredFile {
  fileId: string;
  readToken: string;
  uploadToken: string;
  expiresAt: string;
}
async function checked(response: Response) {
  const value = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      typeof value.error === "string"
        ? value.error
        : "Operazione allegato non riuscita",
    );
  return value;
}
async function digest(bytes: Uint8Array) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", bytes as BufferSource),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export function bytesFromBase64(text: string) {
  const normalized = text.replaceAll("-", "+").replaceAll("_", "/");
  const value = atob(
    normalized + "=".repeat((4 - (normalized.length % 4)) % 4),
  );
  return Uint8Array.from(value, (c) => c.charCodeAt(0));
}
export function bytesToBase64(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 16384)
    text += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return btoa(text);
}
export async function discardStoredFile(file: StoredFile) {
  await apiFetch(`/api/files/${file.fileId}`, {
    method: "DELETE",
    headers: { "X-Upload-Token": file.uploadToken },
  }).catch(() => undefined);
}
export async function uploadEncryptedFile(
  bytes: Uint8Array,
  file: File,
  purpose: "chat" | "paste",
  options: { layers?: 1 | 2; channelHash?: string; expiresInMs?: number } = {},
): Promise<StoredFile> {
  const ticket = await checked(
    await apiFetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose,
        mimeType: attachmentMime(file),
        extension: attachmentExtension(file.name),
        plainSize: file.size,
        size: bytes.byteLength,
        layers: options.layers ?? 1,
        channelHash: options.channelHash,
        expiresInMs: options.expiresInMs,
      }),
    }),
  );
  const result = {
    fileId: ticket.fileId as string,
    readToken: ticket.readToken as string,
    uploadToken: ticket.uploadToken as string,
    expiresAt: "",
  };
  try {
    for (
      let offset = 0, ordinal = 0;
      offset < bytes.length;
      offset += CHUNK_BYTES, ordinal++
    ) {
      const chunk = bytes.slice(offset, offset + CHUNK_BYTES);
      await checked(
        await apiFetch(`/api/files/${result.fileId}/chunks/${ordinal}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Upload-Token": result.uploadToken,
            "X-Chunk-SHA256": await digest(chunk),
          },
          body: chunk as BodyInit,
        }),
      );
    }
    const complete = await checked(
      await apiFetch(`/api/files/${result.fileId}/complete`, {
        method: "POST",
        headers: { "X-Upload-Token": result.uploadToken },
      }),
    );
    result.expiresAt = complete.expiresAt as string;
    return result;
  } catch (error) {
    await discardStoredFile(result);
    throw error;
  }
}
export async function downloadEncryptedFile(
  fileId: string,
  readToken: string,
): Promise<Uint8Array> {
  if (
    !/^[a-zA-Z0-9_-]{1,100}$/.test(fileId) ||
    !/^[a-zA-Z0-9_-]{43}$/.test(readToken)
  )
    throw new Error("Riferimento allegato non valido");
  const headers: Record<string, string> = { "X-File-Token": readToken };
  const info = await checked(await apiFetch(`/api/files/${fileId}`, { headers }));
  const size = Number(info.size),
    chunks = Number(info.chunks),
    chunkBytes = Number(info.chunkBytes),
    expiry = Date.parse(info.expiresAt as string);
  if (
    !Number.isInteger(size) ||
    size <= 0 ||
    size > 14 * 1024 * 1024 ||
    !Number.isInteger(chunks) ||
    chunks < 1 ||
    chunks > 128 ||
    ![128 * 1024, 512 * 1024].includes(chunkBytes) ||
    chunks !== Math.ceil(size / chunkBytes) ||
    !Number.isFinite(expiry)
  )
    throw new Error("Allegato non valido");
  if (info.transferToken)
    headers["X-Transfer-Token"] = String(info.transferToken);
  const result = new Uint8Array(size);
  // Bounded concurrency avoids retaining all encoded chunks and keeps free request rates predictable.
  for (let start = 0; start < chunks; start += 3) {
    await Promise.all(
      Array.from({ length: Math.min(3, chunks - start) }, async (_, i) => {
        if (Date.now() >= expiry) throw new Error("Allegato scaduto");
        const ordinal = start + i;
        const response = await apiFetch(`/api/files/${fileId}/chunks/${ordinal}`, {
          headers,
        });
        if (!response.ok)
          throw new Error(
            response.status === 410
              ? "Allegato scaduto"
              : "Download non riuscito",
          );
        const bytes = bytesFromBase64(await response.text());
        if (
          bytes.length !== Math.min(chunkBytes, size - ordinal * chunkBytes) ||
          (await digest(bytes)) !== response.headers.get("X-Chunk-SHA256")
        )
          throw new Error("Integrità allegato non verificata");
        result.set(bytes, ordinal * chunkBytes);
      }),
    );
  }
  if (Date.now() >= expiry) throw new Error("Allegato scaduto");
  if (info.burn)
    await apiFetch(`/api/files/${fileId}`, { method: "DELETE", headers });
  return result;
}
export async function hydratePasteFiles<
  T extends {
    encryptedFiles?: Array<{
      fileId?: string;
      readToken?: string;
      encryptedContent?: string;
    }> | null;
  },
>(data: T): Promise<T> {
  if (data.encryptedFiles)
    for (const file of data.encryptedFiles) {
      if (file.fileId && file.readToken)
        file.encryptedContent = bytesToBase64(
          await downloadEncryptedFile(file.fileId, file.readToken),
        );
    }
  return data;
}
