import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

// Pusher authentication endpoint for private channels
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const socketId = formData.get('socket_id') as string;
    const channelName = formData.get('channel_name') as string;

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    // For private channels, we just authorize without additional checks
    // The security comes from the E2E encryption with channel password
    const authResponse = pusherServer.authorizeChannel(socketId, channelName);

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 403 });
  }
}

