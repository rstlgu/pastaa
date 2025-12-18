import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, MemberSyncEvent } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelHash, userId, username, publicKey, replyTo } = body;

    if (!channelHash || !userId || !publicKey || !replyTo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const syncEvent: MemberSyncEvent = {
      userId,
      username: username || 'Anonymous',
      publicKey,
      replyTo,
    };

    // Send sync event - this won't trigger join handlers
    await pusherServer.trigger(
      `private-chat-${channelHash}`,
      'member-sync',
      syncEvent
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing member:', error);
    return NextResponse.json({ error: 'Failed to sync member' }, { status: 500 });
  }
}



