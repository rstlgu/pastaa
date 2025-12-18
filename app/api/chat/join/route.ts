import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, MemberJoinEvent } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelHash, userId, username, publicKey } = body;

    if (!channelHash || !userId || !publicKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const joinEvent: MemberJoinEvent = {
      userId,
      username: username || 'Anonymous',
      publicKey,
    };

    // Notify channel that a new member joined
    await pusherServer.trigger(
      `private-chat-${channelHash}`,
      'member-join',
      joinEvent
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error joining channel:', error);
    return NextResponse.json({ error: 'Failed to join channel' }, { status: 500 });
  }
}



