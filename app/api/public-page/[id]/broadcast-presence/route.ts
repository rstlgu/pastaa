import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pageId = params.id;
    const body = await request.json();
    const { userId, name, avatar, cursor, selection, action } = body;

    if (!pageId || !userId) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // Determina il tipo di evento
    let eventName = 'presence-update';
    let eventData: {
      userId: string;
      name?: string;
      avatar?: string;
      cursor?: { x: number; y: number };
      selection?: { start: number; end: number };
      timestamp: number;
    } = {
      userId,
      name,
      avatar,
      cursor,
      selection,
      timestamp: Date.now(),
    };

    if (action === 'join') {
      eventName = 'presence-join';
    } else if (action === 'leave') {
      eventName = 'presence-leave';
      eventData = { userId, timestamp: Date.now() };
    }

    // Broadcast presenza via Pusher
    await pusherServer.trigger(`page-${pageId}`, eventName, eventData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore broadcast presenza:', error);
    return NextResponse.json({ error: 'Errore broadcast presenza' }, { status: 500 });
  }
}

