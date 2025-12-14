import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, ChatMessageEvent } from '@/lib/pusher';
import { p384 } from '@noble/curves/p384';
import { gcm } from '@noble/ciphers/aes';
import { hexToBytes, bytesToUtf8 } from '@noble/ciphers/utils';

// Server Layer 2 key pair (same as handshake)
let serverKeyPair: { privateKey: Uint8Array; publicKey: Uint8Array } | null = null;

function getServerKeyPair() {
  if (!serverKeyPair) {
    const privateKey = p384.utils.randomPrivateKey();
    const publicKey = p384.getPublicKey(privateKey);
    serverKeyPair = { privateKey, publicKey };
  }
  return serverKeyPair;
}

// Decrypt Layer 2 encrypted payload
function decryptLayer2Payload(encrypted: string, iv: string, clientPublicKey?: string): string | null {
  try {
    // For now, we skip Layer 2 decryption since we need client's public key
    // In a full implementation, we'd track sessions per client
    // The Layer 3 E2E encryption is the main security layer
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    let messageData: {
      channelHash: string;
      messageId: string;
      fromUserId: string;
      fromUsername: string;
      encryptedContent: string;
      nonce: string;
      senderPublicKey: string;
    };

    // Check if payload is Layer 2 encrypted
    if (body.layer2 && body.encrypted && body.iv) {
      // Layer 2 decryption would go here
      // For now, we require non-encrypted for MVP
      return NextResponse.json({ error: 'Layer 2 decryption not yet implemented' }, { status: 400 });
    } else {
      messageData = body;
    }

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

