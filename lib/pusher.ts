import PusherClient from "pusher-js";

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(
      import.meta.env.VITE_PUSHER_KEY,
      {
        cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      }
    );
  }
  return pusherClientInstance;
}

// Event types
export interface ChatMessageEvent {
  id: string;
  from: string;
  fromUsername: string;
  // Encrypted content (Layer 3)
  encryptedContent: string;
  nonce: string;
  // Sender's public key for E2E
  senderPublicKey: string;
  timestamp: number;
}

export interface MemberJoinEvent {
  userId: string;
  username: string;
  publicKey: string;
}

export interface MemberLeaveEvent {
  userId: string;
}

export interface MemberSyncEvent {
  userId: string;
  username: string;
  publicKey: string;
  replyTo: string; // ID of the user who requested sync
}

export interface KeyExchangeEvent {
  fromUserId: string;
  toUserId: string;
  publicKey: string;
}

