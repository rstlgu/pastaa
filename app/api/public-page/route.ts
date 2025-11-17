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

    // Validazione ID: solo lettere, numeri, trattini e underscore
    const validIdRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validIdRegex.test(id) || id.length > 100) {
      // Ritorna una pagina vuota per ID non validi invece di errore
      return NextResponse.json({ 
        id, 
        content: '', 
        exists: false 
      });
    }

    try {
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
    } catch (dbError) {
      // Se c'è un errore di database, ritorna pagina vuota invece di errore 500
      console.error('Errore database:', dbError);
      return NextResponse.json({ 
        id, 
        content: '', 
        exists: false 
      });
    }
  } catch (error) {
    console.error('Errore recupero pagina:', error);
    // In caso di errore generico, ritorna pagina vuota invece di errore 500
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || 'unknown';
    return NextResponse.json({ 
      id, 
      content: '', 
      exists: false 
    });
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

