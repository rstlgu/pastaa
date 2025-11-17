import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Recupera una pagina pubblica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID mancante' }, { status: 400 });
    }

    const page = await prisma.publicPage.findUnique({
      where: { id },
    });

    if (!page) {
      // Ritorna una pagina vuota se non esiste
      return NextResponse.json({ 
        id, 
        content: '', 
        exists: false 
      });
    }

    return NextResponse.json({ 
      id: page.id, 
      content: page.content,
      exists: true,
      updatedAt: page.updatedAt
    });
  } catch (error) {
    console.error('Errore recupero pagina:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero della pagina' },
      { status: 500 }
    );
  }
}

// POST - Crea o aggiorna una pagina pubblica
export async function POST(request: NextRequest) {
  try {
    const { id, content } = await request.json();

    if (!id || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Dati mancanti o non validi' },
        { status: 400 }
      );
    }

    // Validazione ID: solo lettere, numeri, trattini e underscore
    const validIdRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validIdRegex.test(id) || id.length > 100) {
      return NextResponse.json(
        { error: 'ID non valido. Usa solo lettere, numeri, - e _' },
        { status: 400 }
      );
    }

    const page = await prisma.publicPage.upsert({
      where: { id },
      update: { content },
      create: { id, content },
    });

    return NextResponse.json({
      success: true,
      id: page.id,
      updatedAt: page.updatedAt
    });
  } catch (error) {
    console.error('Errore salvataggio pagina:', error);
    return NextResponse.json(
      { error: 'Errore nel salvataggio della pagina' },
      { status: 500 }
    );
  }
}

