import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pageId = params.id;
    const body = await request.json();
    const { content, userId, editorMode } = body;

    if (!pageId || !userId || content === undefined) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // Broadcast update via Pusher a tutti gli utenti della pagina
    await pusherServer.trigger(`page-${pageId}`, 'content-update', {
      content,
      userId,
      editorMode,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore broadcast:', error);
    return NextResponse.json({ error: 'Errore broadcast' }, { status: 500 });
  }
}

