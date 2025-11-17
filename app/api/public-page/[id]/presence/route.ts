import { NextRequest, NextResponse } from 'next/server';

// Store in-memory per presenza (in produzione usa Redis o database)
const presenceStore = new Map<string, Map<string, {
  userId: string;
  name: string;
  avatar: string;
  cursor?: { x: number; y: number };
  selection?: { start: number; end: number };
  lastSeen: number;
}>>();

const PRESENCE_TIMEOUT = 5000; // Rimuovi utenti dopo 5 secondi di inattività

// POST - Aggiorna presenza utente
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pageId = params.id;
    const body = await request.json();
    const { userId, name, avatar, cursor, selection } = body;

    if (!pageId || !userId) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // Inizializza store per questa pagina se non esiste
    if (!presenceStore.has(pageId)) {
      presenceStore.set(pageId, new Map());
    }

    const pagePresence = presenceStore.get(pageId)!;
    
    // Aggiorna o crea presenza utente
    const existing = pagePresence.get(userId);
    pagePresence.set(userId, {
      userId,
      name: name || existing?.name || 'Anonymous',
      avatar: avatar || existing?.avatar || '',
      cursor: cursor || existing?.cursor,
      selection: selection || existing?.selection,
      lastSeen: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore aggiornamento presenza:', error);
    return NextResponse.json({ error: 'Errore aggiornamento presenza' }, { status: 500 });
  }
}

// GET - Recupera presenza di tutti gli utenti
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pageId = params.id;
    
    if (!presenceStore.has(pageId)) {
      return NextResponse.json({ users: [] });
    }

    const pagePresence = presenceStore.get(pageId)!;
    const now = Date.now();
    
    // Rimuovi utenti inattivi
    const activeUsers: Array<{
      id: string;
      name: string;
      avatar: string;
      cursor?: { x: number; y: number };
      selection?: { start: number; end: number };
    }> = [];
    pagePresence.forEach((user, userId) => {
      if (now - user.lastSeen < PRESENCE_TIMEOUT) {
        activeUsers.push({
          id: user.userId,
          name: user.name,
          avatar: user.avatar,
          cursor: user.cursor,
          selection: user.selection,
        });
      } else {
        pagePresence.delete(userId);
      }
    });

    return NextResponse.json({ users: activeUsers });
  } catch (error) {
    console.error('Errore recupero presenza:', error);
    return NextResponse.json({ error: 'Errore recupero presenza' }, { status: 500 });
  }
}

