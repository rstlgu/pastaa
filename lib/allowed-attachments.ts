export const ATTACHMENT_TYPES: Readonly<Record<string, readonly string[]>> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "application/pdf": ["pdf"],
  "text/plain": ["txt"],
  "text/markdown": ["md", "markdown"],
  "text/csv": ["csv"],
};
export const ALLOWED_ATTACHMENT_MIME_TYPES = Object.keys(ATTACHMENT_TYPES);
export const ATTACHMENT_ACCEPT = Object.values(ATTACHMENT_TYPES)
  .flat()
  .map((ext) => `.${ext}`)
  .join(",");
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export function isAllowedAttachmentMimeType(mime: string) {
  return Object.hasOwn(ATTACHMENT_TYPES, mime.trim().toLowerCase());
}
export function attachmentExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}
export function validAttachmentDeclaration(mime: unknown, extension: unknown) {
  return (
    typeof mime === "string" &&
    typeof extension === "string" &&
    ATTACHMENT_TYPES[mime]?.includes(extension) === true
  );
}
export function attachmentMime(file: Pick<File, "name" | "type">) {
  const ext = attachmentExtension(file.name);
  return (
    file.type ||
    Object.entries(ATTACHMENT_TYPES).find(([, extensions]) =>
      extensions.includes(ext),
    )?.[0] ||
    ""
  );
}
export function validateAttachmentName(name: string) {
  if (
    !name ||
    name.length > 120 ||
    /\.(exe|com|bat|cmd|js|vbs|scr|msi|ps1|html?|svg)(?:\.|$)/i.test(name) ||
    /[\\/\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(name)
  )
    throw new Error("Nome allegato non valido");
}
export async function validateAttachmentBytes(
  name: string,
  mime: string,
  bytes: Uint8Array,
  expectedSize?: number,
) {
  validateAttachmentName(name);
  if (!validAttachmentDeclaration(mime, attachmentExtension(name)))
    throw new Error("Formato o estensione allegato non consentiti");
  if (
    !bytes.length ||
    bytes.length > MAX_ATTACHMENT_BYTES ||
    (expectedSize !== undefined && bytes.length !== expectedSize)
  )
    throw new Error("Dimensione allegato non valida (max 10 MB)");
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  const starts = (signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);
  let valid = false;
  switch (mime) {
    case "image/jpeg":
      valid = starts([255, 216, 255]);
      break;
    case "image/png":
      valid = starts([137, 80, 78, 71, 13, 10, 26, 10]);
      break;
    case "image/gif":
      valid = ["GIF87a", "GIF89a"].includes(ascii(0, 6));
      break;
    case "image/webp":
      valid = ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
      break;
    case "application/pdf": {
      const pdf = new TextDecoder("latin1").decode(bytes);
      valid =
        ascii(0, 5) === "%PDF-" &&
        /%%EOF\s*$/.test(pdf.slice(-1024)) &&
        !/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction)\b/.test(
          pdf,
        );
      break;
    }
    default:
      try {
        new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(
          bytes,
        );
        valid =
          !bytes.includes(0) &&
          !starts([77, 90]) &&
          !starts([127, 69, 76, 70]) &&
          !starts([80, 75, 3, 4]);
      } catch {
        valid = false;
      }
  }
  if (!valid)
    throw new Error(
      "Il contenuto del file non corrisponde al formato dichiarato",
    );
}
export async function validateAttachment(file: File) {
  const mime = attachmentMime(file);
  if (!file.size || file.size > MAX_ATTACHMENT_BYTES)
    throw new Error("Dimensione allegato non valida (max 10 MB)");
  const bytes = new Uint8Array(await file.arrayBuffer());
  await validateAttachmentBytes(file.name, mime, bytes, file.size);
  if (mime.startsWith("image/")) {
    const decode = (
      globalThis as unknown as {
        createImageBitmap?: (
          image: Blob,
        ) => Promise<{ width: number; height: number; close(): void }>;
      }
    ).createImageBitmap;
    if (!decode) throw new Error("Verifica immagine non disponibile");
    const bitmap = await decode(file);
    try {
      if (
        bitmap.width > 8192 ||
        bitmap.height > 8192 ||
        bitmap.width * bitmap.height > 40000000
      )
        throw new Error("Dimensioni immagine eccessive");
    } finally {
      bitmap.close();
    }
  }
  return mime;
}
