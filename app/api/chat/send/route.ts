import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, ChatMessageEvent } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // For MVP, we accept unencrypted message data
    // Layer 3 E2E encryption is the main security layer
    const messageData = body as {
      channelHash: string;
      messageId: string;
      fromUserId: string;
      fromUsername: string;
      encryptedContent: string;
      nonce: string;
      senderPublicKey: string;
    };

    const { 
      channelHash, 
      messageId,
      fromUserId, 
      fromUsername,
      encryptedContent,
      nonce,
      senderPublicKey,
    } = messageData;

    if (!channelHash || !fromUserId || !encryptedContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const messageEvent: ChatMessageEvent = {
      id: messageId || `msg-${Date.now()}`,
      from: fromUserId,
      fromUsername: fromUsername || 'Anonymous',
      encryptedContent,
      nonce,
      senderPublicKey,
      timestamp: Date.now(),
    };

    // Send message to channel via Pusher
    // Channel name uses the hash (server never sees real channel name)
    // Server only sees encrypted content (Layer 3 E2E)
    await pusherServer.trigger(
      `private-chat-${channelHash}`,
      'message',
      messageEvent
    );

    return NextResponse.json({ success: true, messageId: messageEvent.id });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

