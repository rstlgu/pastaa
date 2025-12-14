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

      // Controlla se la pagina è scaduta
      if (page.expiresAt && new Date(page.expiresAt) < new Date()) {
        // Elimina la pagina scaduta
        await prisma.publicPage.delete({
          where: { id },
        }).catch(() => {
          // Ignora errori di eliminazione
        });
        
        return NextResponse.json({ 
          id, 
          content: '', 
          exists: false,
          expired: true
        });
      }

      return NextResponse.json({ 
        id: page.id, 
        content: page.content,
        exists: true,
        updatedAt: page.updatedAt,
        expiresAt: page.expiresAt
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
    const { id, content, expiresIn, updateExpiration } = await request.json();

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

    // Calcola la data di scadenza se fornita
    let expiresAt: Date | null = null;
    if (expiresIn && typeof expiresIn === 'number' && expiresIn > 0) {
      expiresAt = new Date(Date.now() + expiresIn);
    }
    
    // Calcola nuova scadenza se richiesto aggiornamento
    let newExpiresAt: Date | null = null;
    if (updateExpiration && typeof updateExpiration === 'number' && updateExpiration > 0) {
      newExpiresAt = new Date(Date.now() + updateExpiration);
    }

    try {
      // Prima controlla se la pagina esiste già
      const existingPage = await prisma.publicPage.findUnique({
        where: { id },
      });

      const page = await prisma.publicPage.upsert({
        where: { id },
        update: { 
          content,
          // Aggiorna expiresAt se richiesto (updateExpiration) o se è la prima volta
          ...(newExpiresAt !== null 
            ? { expiresAt: newExpiresAt } 
            : expiresAt !== null && !existingPage?.expiresAt 
              ? { expiresAt } 
              : {}),
        },
        create: { 
          id, 
          content,
          expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
        },
      });

      // Invia evento di aggiornamento (per future implementazioni con broadcasting)
      // Per ora il polling SSE gestirà la sincronizzazione

      return NextResponse.json({
        success: true,
        id: page.id,
        updatedAt: page.updatedAt,
        expiresAt: page.expiresAt
      });
    } catch (dbError) {
      // Se c'è un errore di database, logga e ritorna errore più dettagliato
      console.error('Errore database durante salvataggio:', dbError);
      
      // Se è un errore di connessione o constraint, ritorna errore specifico
      if (dbError && typeof dbError === 'object' && 'code' in dbError && dbError.code === 'P2002') {
        return NextResponse.json(
          { error: 'ID già esistente' },
          { status: 409 }
        );
      }
      
      const errorMessage = dbError instanceof Error ? dbError.message : 'Errore sconosciuto';
      return NextResponse.json(
        { error: 'Errore nel salvataggio della pagina', details: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Errore generico salvataggio pagina:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json(
      { error: 'Errore nel salvataggio della pagina', details: errorMessage },
      { status: 500 }
    );
  }
}

