export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_URL: string;
  RATE_LIMIT_SECRET: string;
  MIGRATION_FREEZE?: string;
  PUSHER_APP_ID?: string;
  PUSHER_KEY?: string;
  PUSHER_SECRET?: string;
  PUSHER_CLUSTER?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  EMAIL_VERIFICATION_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
}
export interface FileRow {
  id: string;
  purpose: "chat" | "paste";
  parentId: string | null;
  channelHash: string | null;
  mimeType: string;
  extension: string;
  plainSize: number;
  size: number;
  chunks: number;
  chunkBytes: number;
  layers: number;
  readTokenHash: string;
  uploadTokenHash: string;
  ready: number;
  burn: number;
  consumed: number;
  transferTokenHash: string | null;
  expiresInMs: number;
  expiresAt: number;
  storedBytes: number;
}
export interface FileReference {
  fileId: string;
  readToken: string;
  iv: string;
  encryptedMetadata: string;
  metadataIv: string;
  passwordIv: string | null;
  passwordMetadataIv: string | null;
  size: number;
}
export interface PasteRow {
  id: string;
  shortId: string;
  encryptedContent: string;
  iv: string;
  passwordIv: string | null;
  salt: string | null;
  hasPassword: number;
  burnAfterReading: number;
  expiresAt: number;
  createdAt: number;
  views: number;
  encryptedFiles: string;
}
