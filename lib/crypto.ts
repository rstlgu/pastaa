/**
 * Libreria di crittografia client-side usando Web Crypto API
 * Implementa AES-GCM 256-bit per crittografia end-to-end
 */

export interface EncryptedData {
  encryptedContent: string;
  iv: string;
  key: string; // questa va nell'URL fragment
}

/**
 * Genera una chiave AES-256 casuale
 */
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Esporta una chiave in formato base64url
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64Url(exported);
}

/**
 * Importa una chiave da base64url
 */
export async function importKey(keyData: string): Promise<CryptoKey> {
  const buffer = base64UrlToArrayBuffer(keyData);
  return await crypto.subtle.importKey(
    "raw",
    buffer,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Cifra il testo usando AES-GCM
 */
export async function encryptText(
  text: string,
  key: CryptoKey
): Promise<{ encryptedContent: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  return encryptBytes(data.buffer, key);
}

/**
 * Cifra dati binari usando AES-GCM
 */
export async function encryptBytes(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<{ encryptedContent: string; iv: string }> {
  // Genera IV casuale (12 bytes per GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );

  return {
    encryptedContent: arrayBufferToBase64Url(encryptedBuffer),
    iv: arrayBufferToBase64Url(iv.buffer),
  };
}

/**
 * Decifra il testo usando AES-GCM
 */
export async function decryptText(
  encryptedContent: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const decryptedBuffer = await decryptBytes(encryptedContent, iv, key);

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Decifra dati binari usando AES-GCM
 */
export async function decryptBytes(
  encryptedContent: string,
  iv: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const encryptedBuffer = base64UrlToArrayBuffer(encryptedContent);
  const ivBuffer = base64UrlToArrayBuffer(iv);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer,
    },
    key,
    encryptedBuffer
  );

  return decryptedBuffer;
}

/**
 * Deriva una chiave da password usando PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = base64UrlToArrayBuffer(salt);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Genera un salt casuale per PBKDF2
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return arrayBufferToBase64Url(salt.buffer);
}

/**
 * Converte ArrayBuffer in base64url (URL-safe)
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    const chunkChars = new Array<string>(chunk.length);

    for (let j = 0; j < chunk.length; j++) {
      chunkChars[j] = String.fromCharCode(chunk[j]);
    }

    binary += chunkChars.join("");
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Converte base64url in ArrayBuffer
 */
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  // Riconverti in base64 standard
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binaryString = atob(base64 + padding);
  
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

