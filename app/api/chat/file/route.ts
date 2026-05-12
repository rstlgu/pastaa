import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAllowedAttachmentMimeType } from "@/lib/allowed-attachments";
import {
  CHAT_FILE_BUCKET,
  CHAT_FILE_MAX_SIZE,
  getSupabaseAdminClient,
  normalizeChatFileExpiryMs,
} from "@/lib/supabase-storage";

const MAX_ENCRYPTED_CHAT_FILE_SIZE = CHAT_FILE_MAX_SIZE + 1024;

function isValidChannelHash(channelHash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(channelHash);
}

function normalizeMimeType(mimeType: FormDataEntryValue | null): string {
  if (typeof mimeType !== "string") return "application/octet-stream";
  const normalized = mimeType.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(normalized)) {
    return "application/octet-stream";
  }
  return normalized.slice(0, 120);
}

async function cleanupExpiredChatFiles(): Promise<void> {
  const expiredFiles = await prisma.chatFile.findMany({
    where: { expiresAt: { lte: new Date() } },
    take: 25,
  });

  if (expiredFiles.length === 0) return;

  const supabase = getSupabaseAdminClient();
  await supabase.storage.from(CHAT_FILE_BUCKET).remove(expiredFiles.map((file) => file.storagePath));
  await prisma.chatFile.deleteMany({
    where: { id: { in: expiredFiles.map((file) => file.id) } },
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const channelHash = formData.get("channelHash");
    const encryptedFile = formData.get("file");
    const mimeType = normalizeMimeType(formData.get("mimeType"));
    const expiresInMs = normalizeChatFileExpiryMs(formData.get("expiresInMs"));

    if (typeof channelHash !== "string" || !isValidChannelHash(channelHash)) {
      return NextResponse.json({ error: "Canale non valido" }, { status: 400 });
    }

    if (!(encryptedFile instanceof File)) {
      return NextResponse.json({ error: "File cifrato mancante" }, { status: 400 });
    }

    if (!isAllowedAttachmentMimeType(mimeType)) {
      return NextResponse.json({ error: "Formato file non supportato" }, { status: 400 });
    }

    if (encryptedFile.size <= 0 || encryptedFile.size > MAX_ENCRYPTED_CHAT_FILE_SIZE) {
      return NextResponse.json({ error: "File troppo grande (max 10MB)" }, { status: 400 });
    }

    await cleanupExpiredChatFiles();

    const expiresAt = new Date(Date.now() + expiresInMs);
    const fileRecord = await prisma.chatFile.create({
      data: {
        channelHash,
        storagePath: `${channelHash}/${crypto.randomUUID()}.bin`,
        size: encryptedFile.size,
        expiresAt,
      },
    });

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage
      .from(CHAT_FILE_BUCKET)
      .upload(fileRecord.storagePath, encryptedFile, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      await prisma.chatFile.delete({ where: { id: fileRecord.id } }).catch(() => undefined);
      console.error("Supabase chat file upload:", error);
      return NextResponse.json({ error: "Upload file non riuscito" }, { status: 502 });
    }

    return NextResponse.json({
      fileId: fileRecord.id,
      expiresAt: fileRecord.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("chat file upload:", error);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
