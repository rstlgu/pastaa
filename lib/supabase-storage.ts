import { createClient } from "@supabase/supabase-js";

export const CHAT_FILE_MAX_SIZE = 10 * 1024 * 1024;
export const CHAT_FILE_EXPIRY_OPTIONS_MS = [
  30 * 1000,
  60 * 1000,
  2 * 60 * 1000,
  5 * 60 * 1000,
  10 * 60 * 1000,
] as const;
export const CHAT_FILE_EXPIRY_MS = 10 * 60 * 1000;
export const CHAT_FILE_BUCKET = process.env.SUPABASE_CHAT_FILES_BUCKET || "chat-files";

export function normalizeChatFileExpiryMs(value: unknown): number {
  const parsedValue =
    typeof value === "string" || typeof value === "number" ? Number(value) : Number.NaN;

  return CHAT_FILE_EXPIRY_OPTIONS_MS.includes(
    parsedValue as (typeof CHAT_FILE_EXPIRY_OPTIONS_MS)[number]
  )
    ? parsedValue
    : CHAT_FILE_EXPIRY_MS;
}

export function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase Storage non configurato");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
