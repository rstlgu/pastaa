import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, MemberLeaveEvent } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelHash, userId } = body;

    if (!channelHash || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const leaveEvent: MemberLeaveEvent = {
      userId,
    };

    // Notify channel that a member left
    await pusherServer.trigger(
      `private-chat-${channelHash}`,
      'member-leave',
      leaveEvent
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving channel:', error);
    return NextResponse.json({ error: 'Failed to leave channel' }, { status: 500 });
  }
}



