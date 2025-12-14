"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Users, Lock, LogOut, Copy, Check, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PastaLogo } from "@/components/pasta-logo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Pusher from "pusher-js";
import {
  generateLayer3KeyPair,
  deriveLayer3SharedSecret,
  encryptLayer3,
  decryptLayer3,
  hashChannelName,
  bytesToHex,
  hexToBytes,
  Layer3Keys,
  initLayer2Session,
  completeLayer2Handshake,
  layer2Encrypt,
  Layer2Session,
} from "@/lib/chat-crypto";
import type { ChatMessageEvent, MemberJoinEvent, MemberLeaveEvent } from "@/lib/pusher";

interface ChatMember {
  odiceId: string;
  username: string;
  publicKey: string;
  sharedSecret?: Uint8Array;
}

interface ChatMessage {
  id: string;
  from: string;
  fromUsername: string;
  content: string;
  timestamp: Date;
  encrypted: boolean;
  isSystem?: boolean;
}

function ChatRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelName = searchParams.get("channel") || "";
  const username = searchParams.get("user") || "Anonymous";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [members, setMembers] = useState<Map<string, ChatMember>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [channelHash, setChannelHash] = useState("");

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<ReturnType<Pusher["subscribe"]> | null>(null);
  const myKeysRef = useRef<Layer3Keys | null>(null);
  const layer2SessionRef = useRef<Layer2Session | null>(null);
  const myIdRef = useRef<string>(`user-${Math.random().toString(36).slice(2, 11)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelPasswordRef = useRef<string>("");

  // Get channel password from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined" && channelName) {
      channelPasswordRef.current = sessionStorage.getItem(`chat-pwd-${channelName}`) || "";
    }
  }, [channelName]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Derive shared secret with a member
  const deriveSharedSecretWithMember = useCallback((memberPublicKey: string): Uint8Array | null => {
    if (!myKeysRef.current) return null;
    try {
      return deriveLayer3SharedSecret(
        myKeysRef.current.privateKey,
        hexToBytes(memberPublicKey),
        channelPasswordRef.current
      );
    } catch (error) {
      console.error("Error deriving shared secret:", error);
      return null;
    }
  }, []);

  // Decrypt message from a member
  const decryptMessage = useCallback((
    encryptedContent: string,
    nonce: string,
    senderPublicKey: string
  ): string | null => {
    const sharedSecret = deriveSharedSecretWithMember(senderPublicKey);
    if (!sharedSecret) return null;
    try {
      return decryptLayer3(encryptedContent, nonce, sharedSecret);
    } catch (error) {
      console.error("Error decrypting message:", error);
      return null;
    }
  }, [deriveSharedSecretWithMember]);

  // Initialize Pusher connection
  useEffect(() => {
    if (!channelName) {
      router.push("/chat");
      return;
    }

    const initChat = async () => {
      // Generate E2E encryption keys (Layer 3)
      myKeysRef.current = generateLayer3KeyPair();

      // Initialize Layer 2 session (client-server encryption)
      const { session, clientPublicKeyHex } = initLayer2Session();
      
      try {
        // Perform Layer 2 handshake with server
        const handshakeResponse = await fetch("/api/chat/handshake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientPublicKey: clientPublicKeyHex }),
        });
        
        if (handshakeResponse.ok) {
          const { serverPublicKey } = await handshakeResponse.json();
          // Complete Layer 2 handshake - derive shared secret
          layer2SessionRef.current = completeLayer2Handshake(session, serverPublicKey);
          console.log("Layer 2 encryption established");
        }
      } catch (error) {
        console.warn("Layer 2 handshake failed, continuing without:", error);
        // Continue without Layer 2 - still have Layer 3 E2E
      }

      // Hash channel name for server (server only sees hash, never real name)
      const hash = await hashChannelName(channelName);
      setChannelHash(hash);

      // Initialize Pusher
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: "/api/chat/auth",
      });

      pusherRef.current = pusher;

      // Subscribe to private channel
      const channel = pusher.subscribe(`private-chat-${hash}`);
      channelRef.current = channel;

      channel.bind("pusher:subscription_succeeded", () => {
        setIsConnecting(false);
        setIsConnected(true);

        // Add system message
        setMessages([{
          id: "system-welcome",
          from: "system",
          fromUsername: "System",
          content: `Welcome to #${channelName}. Messages are end-to-end encrypted.`,
          timestamp: new Date(),
          encrypted: false,
          isSystem: true,
        }]);

        // Announce join to channel
        fetch("/api/chat/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelHash: hash,
            userId: myIdRef.current,
            username,
            publicKey: bytesToHex(myKeysRef.current!.publicKey),
          }),
        }).catch(console.error);
      });

      channel.bind("pusher:subscription_error", () => {
        setIsConnecting(false);
        setMessages([{
          id: "system-error",
          from: "system",
          fromUsername: "System",
          content: "Failed to connect to channel. Please check your connection.",
          timestamp: new Date(),
          encrypted: false,
          isSystem: true,
        }]);
      });

      // Handle incoming messages
      channel.bind("message", (data: ChatMessageEvent) => {
        // Don't process own messages
        if (data.from === myIdRef.current) return;

        // Decrypt message
        const decryptedContent = decryptMessage(
          data.encryptedContent,
          data.nonce,
          data.senderPublicKey
        );

        if (decryptedContent) {
          setMessages((prev) => [...prev, {
            id: data.id,
            from: data.from,
            fromUsername: data.fromUsername,
            content: decryptedContent,
            timestamp: new Date(data.timestamp),
            encrypted: true,
          }]);
        }
      });

      // Handle member join
      channel.bind("member-join", (data: MemberJoinEvent) => {
        if (data.userId === myIdRef.current) return;

        setMembers((prev) => {
          const newMembers = new Map(prev);
          newMembers.set(data.userId, {
            odiceId: data.userId,
            username: data.username,
            publicKey: data.publicKey,
          });
          return newMembers;
        });

        setMessages((prev) => [...prev, {
          id: `system-join-${data.userId}`,
          from: "system",
          fromUsername: "System",
          content: `${data.username} joined the channel`,
          timestamp: new Date(),
          encrypted: false,
          isSystem: true,
        }]);
      });

      // Handle member leave
      channel.bind("member-leave", (data: MemberLeaveEvent) => {
        setMembers((prev) => {
          const member = prev.get(data.userId);
          const newMembers = new Map(prev);
          newMembers.delete(data.userId);

          if (member) {
            setMessages((prevMsgs) => [...prevMsgs, {
              id: `system-leave-${data.userId}`,
              from: "system",
              fromUsername: "System",
              content: `${member.username} left the channel`,
              timestamp: new Date(),
              encrypted: false,
              isSystem: true,
            }]);
          }

          return newMembers;
        });
      });
    };

    initChat();

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
      }
      if (pusherRef.current) {
        pusherRef.current.unsubscribe(`private-chat-${channelHash}`);
        pusherRef.current.disconnect();
      }
    };
  }, [channelName, username, router, decryptMessage, channelHash]);

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected || !myKeysRef.current) return;

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const content = inputMessage.trim();
    
    // Add message locally immediately
    setMessages((prev) => [...prev, {
      id: messageId,
      from: myIdRef.current,
      fromUsername: username,
      content,
      timestamp: new Date(),
      encrypted: true,
    }]);
    
    setInputMessage("");

    // Layer 3: Encrypt message E2E with our key + channel password
    const { ciphertext, nonce } = encryptLayer3(
      content,
      deriveLayer3SharedSecret(
        myKeysRef.current.privateKey,
        myKeysRef.current.publicKey,
        channelPasswordRef.current
      )
    );

    // Prepare payload
    let payload = JSON.stringify({
      channelHash,
      messageId,
      fromUserId: myIdRef.current,
      fromUsername: username,
      encryptedContent: ciphertext,
      nonce,
      senderPublicKey: bytesToHex(myKeysRef.current.publicKey),
    });

    // Layer 2: Optionally encrypt the entire payload for server transit
    let layer2Data: { encrypted: string; iv: string } | null = null;
    if (layer2SessionRef.current?.established) {
      layer2Data = layer2Encrypt(layer2SessionRef.current, payload);
    }

    try {
      // Send with Layer 2 encryption if available
      const requestBody = layer2Data
        ? { layer2: true, encrypted: layer2Data.encrypted, iv: layer2Data.iv }
        : JSON.parse(payload);
      
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [inputMessage, isConnected, username, channelHash]);

  const copyChannelLink = async () => {
    const link = `${window.location.origin}/chat/room?channel=${encodeURIComponent(channelName)}&user=`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveChannel = async () => {
    if (channelHash) {
      await fetch("/api/chat/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelHash,
          userId: myIdRef.current,
        }),
      }).catch(console.error);
    }

    if (channelRef.current) {
      channelRef.current.unbind_all();
    }
    if (pusherRef.current) {
      pusherRef.current.disconnect();
    }

    sessionStorage.removeItem(`chat-pwd-${channelName}`);
    router.push("/chat");
  };

  if (!channelName) {
    return null;
  }

  const membersArray = Array.from(members.values());

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-primary bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/chat" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <PastaLogo className="h-6 w-6 text-primary" />
              <span className="font-bold font-righteous text-sm md:text-base">Chat</span>
            </Link>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm truncate max-w-[120px] md:max-w-none">
                #{channelName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition-colors text-sm"
            >
              <Users className="h-4 w-4" />
              <span>{membersArray.length + 1}</span>
            </button>

            <button
              onClick={copyChannelLink}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              title="Copy invite link"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>

            <button
              onClick={leaveChannel}
              className="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Leave channel"
            >
              <LogOut className="h-4 w-4" />
            </button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Connection status */}
      {isConnecting && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-2">
          <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm">Establishing secure connection...</span>
        </div>
      )}

      {/* Chat container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${msg.from === myIdRef.current ? "justify-end" : "justify-start"}`}
                >
                  {msg.isSystem ? (
                    <div className="bg-muted/50 text-muted-foreground text-sm px-4 py-2 rounded-lg text-center max-w-md">
                      <Shield className="h-4 w-4 inline-block mr-2" />
                      {msg.content}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[80%] md:max-w-[60%] ${
                        msg.from === myIdRef.current
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border-2 border-primary/30"
                      } rounded-2xl px-4 py-3`}
                    >
                      {msg.from !== myIdRef.current && (
                        <p className="text-xs font-medium text-primary mb-1">{msg.fromUsername}</p>
                      )}
                      <p className="break-words">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {msg.encrypted && <Lock className="h-3 w-3 opacity-50" />}
                        <span className="text-[10px] opacity-50">
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <form onSubmit={sendMessage} className="p-4 border-t-2 border-primary/20 bg-card/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-muted border-2 border-transparent focus:border-primary rounded-xl outline-none transition-colors"
                disabled={!isConnected}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || !isConnected}
                className="px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              <Lock className="h-3 w-3 inline-block mr-1" />
              Messages are end-to-end encrypted
            </p>
          </form>
        </div>

        {/* Members sidebar - Desktop */}
        <AnimatePresence>
          {showMembers && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 250, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l-2 border-primary/20 bg-card/50 overflow-hidden hidden md:block"
            >
              <div className="p-4">
                <h3 className="font-medium mb-3">Members ({membersArray.length + 1})</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{username}</span>
                    <span className="text-xs text-muted-foreground">(you)</span>
                  </div>

                  {membersArray.map((member) => (
                    <div key={member.odiceId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{member.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Members bottom sheet - Mobile */}
      <AnimatePresence>
        {showMembers && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMembers(false)}
              className="fixed inset-0 bg-black/50 z-50 md:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed inset-x-0 bottom-0 bg-card border-t-2 border-primary rounded-t-3xl z-50 p-6 md:hidden max-h-[60vh] overflow-y-auto"
            >
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
              <h3 className="font-medium mb-4">Members ({membersArray.length + 1})</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium">{username}</span>
                    <p className="text-xs text-muted-foreground">You</p>
                  </div>
                </div>
                {membersArray.map((member) => (
                  <div key={member.odiceId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{member.username}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatRoom() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <PastaLogo className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading secure chat...</p>
        </div>
      </div>
    }>
      <ChatRoomContent />
    </Suspense>
  );
}
