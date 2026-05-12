import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CHAT_FILE_BUCKET, getSupabaseAdminClient } from "@/lib/supabase-storage";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const file = await prisma.chatFile.findUnique({ where: { id: params.id } });
    if (!file) {
      return NextResponse.json({ error: "File non trovato" }, { status: 404 });
    }

    const supabase = getSupabaseAdminClient();

    if (file.expiresAt <= new Date()) {
      await supabase.storage.from(CHAT_FILE_BUCKET).remove([file.storagePath]);
      await prisma.chatFile.delete({ where: { id: file.id } }).catch(() => undefined);
      return NextResponse.json({ error: "File autodistrutto" }, { status: 410 });
    }

    const { data, error } = await supabase.storage.from(CHAT_FILE_BUCKET).download(file.storagePath);
    if (error || !data) {
      console.error("Supabase chat file download:", error);
      return NextResponse.json({ error: "Download file non riuscito" }, { status: 502 });
    }

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Expires-At": file.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("chat file download:", error);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
