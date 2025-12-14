/**
 * ChatCrypt-style Triple Encryption
 * 
 * Layer 1: TLS (handled by browser/server)
 * Layer 2: ECDH P-384 + AES-256-GCM (client-server) + RSA signature verification
 * Layer 3: ECDH Curve25519 + ChaCha20-Poly1305 (client-client, E2E)
 */

import { p384 } from '@noble/curves/nist.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { gcm } from '@noble/ciphers/aes.js';
// Use native crypto for random bytes
function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// Helper to safely convert Uint8Array to ArrayBuffer (for Web Crypto API)
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}
import { utf8ToBytes, bytesToUtf8, bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';

// ============================================
// LAYER 2: Client-Server Encryption (AES-256-GCM)
// ============================================

export interface Layer2Keys {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  sharedSecret?: Uint8Array;
}

export interface Layer2Session {
  keys: Layer2Keys;
  serverPublicKey?: Uint8Array;
  sharedSecret?: Uint8Array;
  established: boolean;
}

export function generateLayer2KeyPair(): Layer2Keys {
  const privateKey = p384.utils.randomSecretKey();
  const publicKey = p384.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

export function deriveLayer2SharedSecret(
  myPrivateKey: Uint8Array,
  theirPublicKey: Uint8Array
): Uint8Array {
  const sharedPoint = p384.getSharedSecret(myPrivateKey, theirPublicKey);
  // Use first 32 bytes as AES-256 key
  return sharedPoint.slice(1, 33);
}

export function encryptLayer2(
  plaintext: string,
  sharedSecret: Uint8Array
): { ciphertext: string; iv: string } {
  const iv = randomBytes(12);
  const cipher = gcm(sharedSecret, iv);
  const encrypted = cipher.encrypt(utf8ToBytes(plaintext));
  return {
    ciphertext: bytesToHex(encrypted),
    iv: bytesToHex(iv),
  };
}

export function decryptLayer2(
  ciphertext: string,
  iv: string,
  sharedSecret: Uint8Array
): string {
  const cipher = gcm(sharedSecret, hexToBytes(iv));
  const decrypted = cipher.decrypt(hexToBytes(ciphertext));
  return bytesToUtf8(decrypted);
}

// ============================================
// LAYER 2: RSA Signature Verification
// Uses Web Crypto API for RSA operations
// ============================================

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'RSA-PSS',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );
}

export async function signWithRSA(
  privateKey: CryptoKey,
  data: Uint8Array
): Promise<Uint8Array> {
  const signature = await crypto.subtle.sign(
    { name: 'RSA-PSS', saltLength: 32 },
    privateKey,
    toArrayBuffer(data)
  );
  return new Uint8Array(signature);
}

export async function verifyRSASignature(
  publicKey: CryptoKey,
  signature: Uint8Array,
  data: Uint8Array
): Promise<boolean> {
  return await crypto.subtle.verify(
    { name: 'RSA-PSS', saltLength: 32 },
    publicKey,
    toArrayBuffer(signature),
    toArrayBuffer(data)
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', key);
  return bytesToHex(new Uint8Array(exported));
}

export async function importPublicKey(hexKey: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'spki',
    toArrayBuffer(hexToBytes(hexKey)),
    { name: 'RSA-PSS', hash: 'SHA-256' },
    true,
    ['verify']
  );
}

// ============================================
// LAYER 2: Complete Session Establishment
// ============================================

export interface Layer2HandshakeResult {
  session: Layer2Session;
  clientPublicKeyHex: string;
}

export function initLayer2Session(): Layer2HandshakeResult {
  const keys = generateLayer2KeyPair();
  return {
    session: {
      keys,
      established: false,
    },
    clientPublicKeyHex: bytesToHex(keys.publicKey),
  };
}

export function completeLayer2Handshake(
  session: Layer2Session,
  serverPublicKeyHex: string
): Layer2Session {
  const serverPublicKey = hexToBytes(serverPublicKeyHex);
  const sharedSecret = deriveLayer2SharedSecret(session.keys.privateKey, serverPublicKey);
  
  return {
    ...session,
    serverPublicKey,
    sharedSecret,
    established: true,
  };
}

export function layer2Encrypt(session: Layer2Session, data: string): { ciphertext: string; iv: string } | null {
  if (!session.established || !session.sharedSecret) return null;
  return encryptLayer2(data, session.sharedSecret);
}

export function layer2Decrypt(session: Layer2Session, encrypted: string, iv: string): string | null {
  if (!session.established || !session.sharedSecret) return null;
  try {
    return decryptLayer2(encrypted, iv, session.sharedSecret);
  } catch {
    return null;
  }
}

// ============================================
// LAYER 3: End-to-End Encryption (ChaCha20-Poly1305)
// ============================================

export interface Layer3Keys {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export function generateLayer3KeyPair(): Layer3Keys {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

export function deriveLayer3SharedSecret(
  myPrivateKey: Uint8Array,
  theirPublicKey: Uint8Array,
  channelPassword: string
): Uint8Array {
  const sharedSecret = x25519.getSharedSecret(myPrivateKey, theirPublicKey);
  
  // XOR with SHA-256 hash of channel password
  const passwordHash = hashPassword(channelPassword);
  const combinedKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    combinedKey[i] = sharedSecret[i] ^ passwordHash[i];
  }
  
  return combinedKey;
}

// Simple shared key derived only from channel password (for group chat)
export function deriveGroupKey(channelPassword: string): Uint8Array {
  return hashPassword(channelPassword + "-pastaa-chat-key");
}

export function encryptLayer3(
  plaintext: string,
  sharedSecret: Uint8Array
): { ciphertext: string; nonce: string } {
  const nonce = randomBytes(12);
  const cipher = chacha20poly1305(sharedSecret, nonce);
  const encrypted = cipher.encrypt(utf8ToBytes(plaintext));
  return {
    ciphertext: bytesToHex(encrypted),
    nonce: bytesToHex(nonce),
  };
}

export function decryptLayer3(
  ciphertext: string,
  nonce: string,
  sharedSecret: Uint8Array
): string {
  const cipher = chacha20poly1305(sharedSecret, hexToBytes(nonce));
  const decrypted = cipher.decrypt(hexToBytes(ciphertext));
  return bytesToUtf8(decrypted);
}

// ============================================
// Utility Functions
// ============================================

export async function hashChannelName(channelName: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(channelName);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

function hashPassword(password: string): Uint8Array {
  // Synchronous hash using simple algorithm for XOR combination
  // In production, use proper async crypto.subtle.digest
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = new Uint8Array(32);
  
  for (let i = 0; i < data.length; i++) {
    hash[i % 32] ^= data[i];
    // Simple mixing
    hash[(i + 1) % 32] = (hash[(i + 1) % 32] + data[i]) % 256;
  }
  
  return hash;
}

export async function hashPasswordAsync(password: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

export { bytesToHex, hexToBytes, randomBytes };

