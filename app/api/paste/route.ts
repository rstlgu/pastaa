import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MAX_TEXT_SIZE = 100 * 1024; // 100KB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_COUNT = 10;
const MAX_ENCRYPTED_TEXT_SIZE =
  Math.ceil((Math.ceil((MAX_TEXT_SIZE + 16) * 4 / 3) + 16) * 4 / 3) + 1024;
const MAX_ENCRYPTED_FILE_SIZE =
  Math.ceil((Math.ceil((MAX_FILE_SIZE + 16) * 4 / 3) + 16) * 4 / 3) + 1024;
const MAX_ENCRYPTED_METADATA_SIZE = 16 * 1024;

interface EncryptedFilePayload {
  encryptedContent: string;
  iv: string;
  encryptedMetadata: string;
  metadataIv: string;
  passwordIv?: string | null;
  passwordMetadataIv?: string | null;
  size: number;
}

function isEncryptedFilePayload(file: unknown): file is EncryptedFilePayload {
  if (!file || typeof file !== "object") return false;

  const candidate = file as Record<string, unknown>;

  return (
    typeof candidate.encryptedContent === "string" &&
    typeof candidate.iv === "string" &&
    typeof candidate.encryptedMetadata === "string" &&
    typeof candidate.metadataIv === "string" &&
    Number.isInteger(candidate.size) &&
    typeof candidate.size === "number" &&
    candidate.size >= 0
  );
}

function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      encryptedContent,
      iv,
      passwordIv,
      salt,
      hasPassword,
      burnAfterReading,
      expiresIn,
      encryptedFileContent,
      fileIv,
      encryptedFileMetadata,
      fileMetadataIv,
      passwordFileIv,
      passwordFileMetadataIv,
      fileSize,
      encryptedFiles,
    } = body;

    // Validazione
    if (!encryptedContent || !iv) {
      return NextResponse.json(
        { error: "Contenuto cifrato e IV sono obbligatori" },
        { status: 400 }
      );
    }

    if (encryptedContent.length > MAX_ENCRYPTED_TEXT_SIZE) {
      return NextResponse.json(
        { error: "Contenuto troppo grande (max 100KB)" },
        { status: 400 }
      );
    }

    const encryptedFileList = Array.isArray(encryptedFiles) ? encryptedFiles : [];
    const hasLegacyFile = Boolean(encryptedFileContent || fileIv || encryptedFileMetadata || fileMetadataIv);
    const hasFile = encryptedFileList.length > 0 || hasLegacyFile;

    if (encryptedFileList.length > 0) {
      if (encryptedFileList.length > MAX_FILE_COUNT) {
        return NextResponse.json(
          { error: "Troppi file (max 10)" },
          { status: 400 }
        );
      }

      if (!encryptedFileList.every(isEncryptedFilePayload)) {
        return NextResponse.json(
          { error: "Dati file cifrati incompleti" },
          { status: 400 }
        );
      }

      const totalFileSize = encryptedFileList.reduce((total, file) => total + file.size, 0);
      const totalEncryptedFileSize = encryptedFileList.reduce(
        (total, file) => total + file.encryptedContent.length,
        0
      );
      const totalEncryptedMetadataSize = encryptedFileList.reduce(
        (total, file) => total + file.encryptedMetadata.length,
        0
      );

      if (
        totalFileSize > MAX_FILE_SIZE ||
        !Number.isInteger(fileSize) ||
        fileSize !== totalFileSize
      ) {
        return NextResponse.json(
          { error: "File troppo grandi (max 10MB totali)" },
          { status: 400 }
        );
      }

      if (
        totalEncryptedFileSize > MAX_ENCRYPTED_FILE_SIZE ||
        totalEncryptedMetadataSize > MAX_ENCRYPTED_METADATA_SIZE * MAX_FILE_COUNT
      ) {
        return NextResponse.json(
          { error: "File cifrati troppo grandi" },
          { status: 400 }
        );
      }
    } else if (hasLegacyFile) {
      if (!encryptedFileContent || !fileIv || !encryptedFileMetadata || !fileMetadataIv) {
        return NextResponse.json(
          { error: "Dati file cifrati incompleti" },
          { status: 400 }
        );
      }

      if (!Number.isInteger(fileSize) || fileSize < 0 || fileSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File troppo grande (max 10MB)" },
          { status: 400 }
        );
      }

      if (
        encryptedFileContent.length > MAX_ENCRYPTED_FILE_SIZE ||
        encryptedFileMetadata.length > MAX_ENCRYPTED_METADATA_SIZE
      ) {
        return NextResponse.json(
          { error: "File cifrato troppo grande" },
          { status: 400 }
        );
      }
    }

    // Calcola data di scadenza
    let expiresAt: Date | null = null;
    if (expiresIn) {
      const now = new Date();
      switch (expiresIn) {
        case "1h":
          expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case "4h":
          expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);
          break;
        case "1d":
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case "7d":
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    // Genera short ID unico
    let shortId = generateShortId();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.paste.findUnique({ where: { shortId } });
      if (!existing) break;
      shortId = generateShortId();
      attempts++;
    }

    // Crea paste
    const paste = await prisma.paste.create({
      data: {
        shortId,
        encryptedContent,
        iv,
        passwordIv: passwordIv || null,
        salt: salt || null,
        hasPassword: hasPassword || false,
        burnAfterReading: burnAfterReading || false,
        expiresAt,
        encryptedFileContent: encryptedFileContent || null,
        fileIv: fileIv || null,
        encryptedFileMetadata: encryptedFileMetadata || null,
        fileMetadataIv: fileMetadataIv || null,
        passwordFileIv: passwordFileIv || null,
        passwordFileMetadataIv: passwordFileMetadataIv || null,
        fileSize: hasFile ? fileSize : null,
        encryptedFiles: encryptedFileList.length > 0 ? JSON.stringify(encryptedFileList) : null,
      },
    });

    return NextResponse.json({ id: paste.id, shortId: paste.shortId }, { status: 201 });
  } catch (error) {
    console.error("Errore creazione paste:", error);
    return NextResponse.json(
      { error: "Errore del server" },
      { status: 500 }
    );
  }
}

