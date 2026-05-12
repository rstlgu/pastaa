import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const paste = await prisma.paste.findUnique({
      where: { id },
    });

    if (!paste) {
      return NextResponse.json(
        { error: "Paste non trovato" },
        { status: 404 }
      );
    }

    // Verifica scadenza
    if (paste.expiresAt && new Date() > paste.expiresAt) {
      await prisma.paste.delete({ where: { id } });
      return NextResponse.json({ error: "Paste scaduto" }, { status: 410 });
    }

    // Se burn after reading, elimina dopo questa lettura
    const shouldDelete = paste.burnAfterReading && paste.views === 0;
    
    const response = {
      encryptedContent: paste.encryptedContent,
      iv: paste.iv,
      passwordIv: paste.passwordIv,
      salt: paste.salt,
      hasPassword: paste.hasPassword,
      burnAfterReading: paste.burnAfterReading,
      encryptedFileContent: paste.encryptedFileContent,
      fileIv: paste.fileIv,
      encryptedFileMetadata: paste.encryptedFileMetadata,
      fileMetadataIv: paste.fileMetadataIv,
      passwordFileIv: paste.passwordFileIv,
      passwordFileMetadataIv: paste.passwordFileMetadataIv,
      encryptedFiles: paste.encryptedFiles ? JSON.parse(paste.encryptedFiles) : null,
    };

    // Incrementa visualizzazioni e elimina se necessario
    if (shouldDelete) {
      await prisma.paste.delete({ where: { id } });
    } else {
      await prisma.paste.update({
        where: { id },
        data: { views: { increment: 1 } },
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Errore recupero paste:", error);
    return NextResponse.json(
      { error: "Errore del server" },
      { status: 500 }
    );
  }
}

