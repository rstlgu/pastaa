"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Lock, LogOut, Shield, Plus, Hash, X, Menu, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PastaLogo } from "@/components/pasta-logo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Pusher from "pusher-js";
import {
  generateLayer3KeyPair,
  deriveGroupKey,
  encryptLayer3,
  decryptLayer3,
  hashChannelName,
  bytesToHex,
  Layer3Keys,
} from "@/lib/chat-crypto";
import type { ChatMessageEvent, MemberJoinEvent, MemberLeaveEvent, MemberSyncEvent } from "@/lib/pusher";

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

interface ChannelData {
  name: string;
  password: string;
  hash: string;
  messages: ChatMessage[];
  members: Map<string, ChatMember>;
  keys: Layer3Keys;
  userId: string;
  isConnected: boolean;
  unreadCount: number;
}

interface SavedChannel {
  name: string;
  password: string;
}

function ChatRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialChannelName = searchParams.get("channel") || "";
  const username = searchParams.get("user") || "Anonymous";

  // Multi-channel state
  const [channels, setChannels] = useState<Map<string, ChannelData>>(new Map());
  const [activeChannelName, setActiveChannelName] = useState<string>(initialChannelName);
  const [showChannelsSidebar, setShowChannelsSidebar] = useState(true);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelPassword, setNewChannelPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // UI state
  const [inputMessage, setInputMessage] = useState("");
  const [showMembers, setShowMembers] = useState(true);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const pusherRef = useRef<Pusher | null>(null);
  const channelRefs = useRef<Map<string, ReturnType<Pusher["subscribe"]>>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get active channel data
  const activeChannel = channels.get(activeChannelName);

  // Save channels to sessionStorage
  const saveChannelsToStorage = useCallback((channelsMap: Map<string, ChannelData>) => {
    const savedChannels: SavedChannel[] = Array.from(channelsMap.values()).map(ch => ({
      name: ch.name,
      password: ch.password,
    }));
    sessionStorage.setItem('chat-channels', JSON.stringify(savedChannels));
  }, []);

  // Load channels from sessionStorage
  const loadChannelsFromStorage = useCallback((): SavedChannel[] => {
    const saved = sessionStorage.getItem('chat-channels');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }, []);

  // Generate consistent color from username (Telegram-style)
  const getUserColor = useCallback((name: string): string => {
    const colors = [
      "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
      "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500",
      "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500",
      "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500", "bg-rose-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Get initials from username
  const getInitials = useCallback((name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, []);

  // Initialize - check for initial channel from URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    if (!initialChannelName || !username || username === "Anonymous") {
      router.push("/chat");
      return;
    }

    // Check if user has logged in for this channel
    const passwordKey = `chat-pwd-${initialChannelName}`;
    const hasLoggedIn = sessionStorage.getItem(passwordKey) !== null;
    
    if (!hasLoggedIn) {
      router.push("/chat");
      return;
    }

    setIsReady(true);
  }, [initialChannelName, username, router]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (activeChannel && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChannel?.messages, activeChannel?.messages.length]);

  // Connect to a channel
  const connectToChannel = useCallback(async (channelName: string, password: string) => {
    if (channels.has(channelName)) {
      // Already connected, just switch to it
      setActiveChannelName(channelName);
      // Reset unread count
      setChannels(prev => {
        const updated = new Map(prev);
        const channel = updated.get(channelName);
        if (channel) {
          channel.unreadCount = 0;
        }
        return updated;
      });
      return;
    }

    try {
      // Generate keys and user ID
      const keys = generateLayer3KeyPair();
      const userId = `user-${Math.random().toString(36).slice(2, 11)}`;
      const hash = await hashChannelName(channelName);

      // Initialize Pusher if needed
      if (!pusherRef.current) {
        pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
          authEndpoint: "/api/chat/auth",
        });
      }

      // Subscribe to channel
      const pusherChannel = pusherRef.current.subscribe(`private-chat-${hash}`);
      channelRefs.current.set(channelName, pusherChannel);

      // Create channel data
      const channelData: ChannelData = {
        name: channelName,
        password,
        hash,
        messages: [],
        members: new Map(),
        keys,
        userId,
        isConnected: false,
        unreadCount: 0,
      };

      // Setup event handlers
      pusherChannel.bind("pusher:subscription_succeeded", () => {
        setChannels(prev => {
          const updated = new Map(prev);
          const ch = updated.get(channelName);
          if (ch) {
            ch.isConnected = true;
            ch.members.set(userId, {
              odiceId: userId,
              username,
              publicKey: bytesToHex(keys.publicKey),
            });
            
            // Add welcome message only if it doesn't exist yet
            const hasWelcomeMessage = ch.messages.some(msg => 
              msg.isSystem && msg.content.includes(`Welcome to #${channelName}`)
            );
            
            if (!hasWelcomeMessage) {
              ch.messages.push({
                id: `system-welcome-${channelName}-${userId}`,
                from: "system",
                fromUsername: "System",
                content: `Welcome to #${channelName}. Messages are end-to-end encrypted.`,
                timestamp: new Date(),
                encrypted: false,
                isSystem: true,
              });
            }
          }
          return updated;
        });

        // Announce join
        fetch("/api/chat/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelHash: hash,
            userId,
            username,
            publicKey: bytesToHex(keys.publicKey),
          }),
        }).catch(console.error);
      });

      pusherChannel.bind("message", (data: ChatMessageEvent) => {
        setChannels(prev => {
          const updated = new Map(prev);
          const ch = updated.get(channelName);
          if (!ch || data.from === ch.userId) return prev;

          // Check if message already exists (prevent duplicates)
          const messageExists = ch.messages.some(msg => msg.id === data.id);
          if (messageExists) return prev;

          // Decrypt message
          let content = "[Encrypted - wrong password?]";
          let decryptionFailed = true;
          
          try {
            const groupKey = deriveGroupKey(password);
            const decryptedContent = decryptLayer3(data.encryptedContent, data.nonce, groupKey);
            if (decryptedContent) {
              content = decryptedContent;
              decryptionFailed = false;
            }
          } catch (error) {
            console.error("Decryption failed:", error);
          }

          ch.messages.push({
            id: data.id,
            from: data.from,
            fromUsername: data.fromUsername,
            content,
            timestamp: new Date(data.timestamp),
            encrypted: true,
            isSystem: decryptionFailed,
          });

          // Increment unread if not active channel
          if (channelName !== activeChannelName) {
            ch.unreadCount++;
          }

          return updated;
        });
      });

      pusherChannel.bind("member-join", (data: MemberJoinEvent) => {
        setChannels(prev => {
          const updated = new Map(prev);
          const ch = updated.get(channelName);
          if (!ch || data.userId === ch.userId) return prev;

          if (!ch.members.has(data.userId)) {
            ch.members.set(data.userId, {
              odiceId: data.userId,
              username: data.username,
              publicKey: data.publicKey,
            });

            ch.messages.push({
              id: `system-join-${data.userId}-${Date.now()}`,
              from: "system",
              fromUsername: "System",
              content: `${data.username} joined the channel`,
              timestamp: new Date(),
              encrypted: false,
              isSystem: true,
            });

            // Send sync
            fetch("/api/chat/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channelHash: hash,
                userId: ch.userId,
                username,
                publicKey: bytesToHex(ch.keys.publicKey),
                replyTo: data.userId,
              }),
            }).catch(console.error);
          }

          return updated;
        });
      });

      pusherChannel.bind("member-leave", (data: MemberLeaveEvent) => {
        setChannels(prev => {
          const updated = new Map(prev);
          const ch = updated.get(channelName);
          if (!ch) return prev;

          const member = ch.members.get(data.userId);
          if (member) {
            ch.members.delete(data.userId);
            ch.messages.push({
              id: `system-leave-${data.userId}-${Date.now()}`,
              from: "system",
              fromUsername: "System",
              content: `${member.username} left the channel`,
              timestamp: new Date(),
              encrypted: false,
              isSystem: true,
            });
          }

          return updated;
        });
      });

      pusherChannel.bind("member-sync", (data: MemberSyncEvent) => {
        setChannels(prev => {
          const updated = new Map(prev);
          const ch = updated.get(channelName);
          if (!ch || data.replyTo !== ch.userId || data.userId === ch.userId) return prev;

          if (!ch.members.has(data.userId)) {
            ch.members.set(data.userId, {
              odiceId: data.userId,
              username: data.username,
              publicKey: data.publicKey,
            });
          }

          return updated;
        });
      });

      // Add channel to state
      setChannels(prev => {
        const updated = new Map(prev);
        updated.set(channelName, channelData);
        saveChannelsToStorage(updated);
        return updated;
      });

      setActiveChannelName(channelName);

    } catch (error) {
      console.error("Error connecting to channel:", error);
    }
  }, [channels, username, activeChannelName, saveChannelsToStorage]);

  // Load saved channels on mount
  useEffect(() => {
    if (!isReady) return;

    const savedChannels = loadChannelsFromStorage();
    
    // If we have the initial channel, add it if not in saved
    if (initialChannelName) {
      const passwordKey = `chat-pwd-${initialChannelName}`;
      const password = sessionStorage.getItem(passwordKey) || "";
      
      const hasChannel = savedChannels.some(ch => ch.name === initialChannelName);
      if (!hasChannel) {
        savedChannels.unshift({ name: initialChannelName, password });
      }

      // Connect to initial channel
      connectToChannel(initialChannelName, password);
    }

    // Connect to other saved channels
    savedChannels.forEach(ch => {
      if (ch.name !== initialChannelName) {
        setTimeout(() => connectToChannel(ch.name, ch.password), 100);
      }
    });
  }, [isReady]);

  // Send message to active channel
  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeChannel || !activeChannel.isConnected) return;

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const content = inputMessage.trim();
    
    // Clear input immediately
    setInputMessage("");
    
    // Add message locally (only if it doesn't exist)
    setChannels(prev => {
      const updated = new Map(prev);
      const ch = updated.get(activeChannelName);
      if (ch) {
        // Check if message already exists
        const messageExists = ch.messages.some(msg => msg.id === messageId);
        if (!messageExists) {
          ch.messages.push({
            id: messageId,
            from: ch.userId,
            fromUsername: username,
            content,
            timestamp: new Date(),
            encrypted: true,
          });
        }
      }
      return updated;
    });

    // Encrypt and send
    const groupKey = deriveGroupKey(activeChannel.password);
    const { ciphertext, nonce } = encryptLayer3(content, groupKey);

    try {
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelHash: activeChannel.hash,
          messageId,
          fromUserId: activeChannel.userId,
          fromUsername: username,
          encryptedContent: ciphertext,
          nonce,
          senderPublicKey: bytesToHex(activeChannel.keys.publicKey),
        }),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [inputMessage, activeChannel, activeChannelName, username]);

  // Add new channel
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const channelName = newChannelName.trim();
    const password = newChannelPassword;

    // Save password to sessionStorage
    sessionStorage.setItem(`chat-pwd-${channelName}`, password);

    // Connect to channel
    await connectToChannel(channelName, password);

    // Reset form
    setNewChannelName("");
    setNewChannelPassword("");
    setShowAddChannel(false);
  };

  // Leave channel
  const leaveChannel = async (channelName: string) => {
    const channel = channels.get(channelName);
    if (!channel) return;

    // Notify server
    await fetch("/api/chat/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelHash: channel.hash,
        userId: channel.userId,
      }),
    }).catch(console.error);

    // Unsubscribe from Pusher
    const pusherChannel = channelRefs.current.get(channelName);
    if (pusherChannel) {
      pusherChannel.unbind_all();
      pusherRef.current?.unsubscribe(`private-chat-${channel.hash}`);
      channelRefs.current.delete(channelName);
    }

    // Remove from state
    setChannels(prev => {
      const updated = new Map(prev);
      updated.delete(channelName);
      saveChannelsToStorage(updated);
      
      // If leaving active channel, switch to another or go to chat home
      if (channelName === activeChannelName) {
        const remaining = Array.from(updated.keys());
        if (remaining.length > 0) {
          setActiveChannelName(remaining[0]);
        } else {
          router.push("/chat");
        }
      }
      
      return updated;
    });

    // Remove password
    sessionStorage.removeItem(`chat-pwd-${channelName}`);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Notify server and cleanup all channels
      channels.forEach((channel, channelName) => {
        fetch("/api/chat/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelHash: channel.hash,
            userId: channel.userId,
          }),
        }).catch(console.error);
      });

      // Disconnect Pusher
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, []);

  if (!isReady) {
    return null;
  }

  // Get members array (excluding self)
  const membersArray = activeChannel 
    ? Array.from(activeChannel.members.values()).filter(m => m.odiceId !== activeChannel.userId)
    : [];

  const channelsArray = Array.from(channels.values());

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b-2 border-primary bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <PastaLogo className="h-6 w-6 text-primary" />
              <span className="font-bold font-righteous text-sm md:text-base">Chat</span>
            </Link>
            {activeChannel && (
              <>
                <div className="h-5 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span className="font-mono text-sm truncate max-w-[120px] md:max-w-none">
                    #{activeChannel.name}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChannelsSidebar(!showChannelsSidebar)}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition-colors text-sm"
            >
              <Hash className="h-4 w-4" />
              <span>{channelsArray.length}</span>
            </button>

            {activeChannel && (
              <button
                onClick={() => setShowMembers(!showMembers)}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition-colors text-sm"
              >
                <Users className="h-4 w-4" />
                <span>{membersArray.length + 1}</span>
              </button>
            )}
            {activeChannel && (
              <button
                onClick={() => router.push("/chat")}
                className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                title="Exit"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Channels sidebar - Desktop (left) */}
        <AnimatePresence>
          {showChannelsSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 250, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r-2 border-primary/20 bg-card/50 overflow-hidden hidden md:block"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Channels ({channelsArray.length})</h3>
                  <button
                    onClick={() => setShowAddChannel(true)}
                    className="p-1.5 hover:bg-primary/10 rounded-md transition-colors"
                    title="Add channel"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {channelsArray.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No channels yet</p>
                      <button
                        onClick={() => setShowAddChannel(true)}
                        className="mt-3 text-xs text-primary hover:underline"
                      >
                        Create one
                      </button>
                    </div>
                  ) : (
                    channelsArray.map((channel) => (
                      <div
                        key={channel.name}
                        className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          channel.name === activeChannelName
                            ? "bg-primary/10"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => {
                          setActiveChannelName(channel.name);
                          setChannels(prev => {
                            const updated = new Map(prev);
                            const ch = updated.get(channel.name);
                            if (ch) ch.unreadCount = 0;
                            return updated;
                          });
                        }}
                      >
                        <Hash className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{channel.name}</p>
                          {channel.unreadCount > 0 && (
                            <span className="text-xs text-primary font-bold">
                              {channel.unreadCount} new
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            leaveChannel(channel.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                          title="Leave channel"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat area */}
        {activeChannel ? (
          <div className="flex-1 flex flex-col min-w-0 relative">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scrollbar relative">
              <AnimatePresence initial={false}>
                {activeChannel.messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex ${msg.isSystem ? "justify-center" : msg.from === activeChannel.userId ? "justify-end" : "justify-start"}`}
                  >
                    {msg.isSystem ? (
                      <div className="bg-muted/50 text-muted-foreground text-xs px-4 py-1.5 rounded-full">
                        <Shield className="h-3 w-3 inline-block mr-1.5 -mt-0.5" />
                        {msg.content}
                      </div>
                    ) : (
                      <div 
                        className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] ${
                          msg.from === activeChannel.userId ? "flex-row-reverse" : ""
                        }`}
                        onClick={() => setExpandedMessageId(expandedMessageId === msg.id ? null : msg.id)}
                      >
                        {/* Avatar */}
                        {msg.from !== activeChannel.userId && (
                          <div 
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getUserColor(msg.fromUsername)}`}
                          >
                            {getInitials(msg.fromUsername)}
                          </div>
                        )}
                        
                        {/* Message bubble */}
                        <div
                          className={`relative min-w-[80px] max-w-[500px] ${
                            msg.from === activeChannel.userId
                              ? "bg-primary text-primary-foreground rounded-[12px] rounded-br-[3px]"
                              : "bg-card border-2 border-primary/20 rounded-[12px] rounded-bl-[3px]"
                          } px-3 py-2 cursor-pointer active:opacity-80 transition-opacity`}
                        >
                          {msg.from !== activeChannel.userId && (
                            <p className={`text-xs font-semibold mb-0.5 ${getUserColor(msg.fromUsername).replace('bg-', 'text-')}`}>
                              {msg.fromUsername}
                            </p>
                          )}
                          <p className="break-words text-sm">{msg.content}</p>
                          
                          {/* Time - shown on tap */}
                          <AnimatePresence>
                            {expandedMessageId === msg.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center justify-end gap-1 mt-1 overflow-hidden"
                              >
                                {msg.encrypted && <Lock className="h-3 w-3 opacity-50" />}
                                <span className="text-[10px] opacity-60">
                                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Message input with fade effect */}
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-background/30 to-background/90 pointer-events-none" />
              <form onSubmit={sendMessage} className="p-3 md:p-4 bg-transparent relative">
                <div className="relative flex items-center max-w-3xl mx-auto">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full pl-4 pr-14 py-3 bg-muted border-2 border-transparent focus:border-primary rounded-full outline-none transition-colors text-base"
                    disabled={!activeChannel.isConnected}
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || !activeChannel.isConnected}
                    className="absolute right-1.5 h-9 w-9 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="18" 
                      height="18" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </button>
              </div>
            </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div>
              <Hash className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No channel selected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a channel or create a new one
              </p>
              <button
                onClick={() => setShowAddChannel(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create Channel
              </button>
            </div>
          </div>
        )}

        {/* Members sidebar - Desktop */}
        <AnimatePresence>
          {showMembers && activeChannel && (
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${getUserColor(username)}`}>
                      {getInitials(username)}
                    </div>
                    <span className="text-sm font-medium">{username}</span>
                    <span className="text-xs text-muted-foreground">(you)</span>
                  </div>

                  {membersArray.map((member) => (
                    <div key={member.odiceId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${getUserColor(member.username)}`}>
                        {getInitials(member.username)}
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

      {/* Add channel modal */}
      <AnimatePresence>
        {showAddChannel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddChannel(false)}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card border-2 border-primary/30 rounded-2xl p-6 w-full max-w-md"
              >
                <h2 className="text-xl font-bold mb-4">Join New Channel</h2>
                <form onSubmit={handleAddChannel} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                      Channel Name
                    </label>
                    <input
                      type="text"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="my-channel"
                      className="w-full px-4 py-2.5 bg-muted border-2 border-transparent focus:border-primary rounded-lg outline-none transition-colors"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                      Password (optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newChannelPassword}
                        onChange={(e) => setNewChannelPassword(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 bg-muted border-2 border-transparent focus:border-primary rounded-lg outline-none transition-colors pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddChannel(false)}
                      className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newChannelName.trim()}
                      className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Join Channel
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Members bottom sheet - Mobile */}
      <AnimatePresence>
        {showMembers && activeChannel && (
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${getUserColor(username)}`}>
                    {getInitials(username)}
                  </div>
                  <div>
                    <span className="font-medium">{username}</span>
                    <p className="text-xs text-muted-foreground">You</p>
                  </div>
                </div>
                {membersArray.map((member) => (
                  <div key={member.odiceId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${getUserColor(member.username)}`}>
                      {getInitials(member.username)}
                    </div>
                    <span className="font-medium">{member.username}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Channels bottom sheet - Mobile */}
      <AnimatePresence>
        {showChannelsSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChannelsSidebar(false)}
              className="fixed inset-0 bg-black/50 z-50 md:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed inset-x-0 bottom-0 bg-card border-t-2 border-primary rounded-t-3xl z-50 p-6 md:hidden max-h-[70vh] overflow-y-auto"
            >
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Channels ({channelsArray.length})</h3>
                <button
                  onClick={() => {
                    setShowChannelsSidebar(false);
                    setShowAddChannel(true);
                  }}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                  title="Add channel"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                {channelsArray.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Hash className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="mb-3">No channels yet</p>
                    <button
                      onClick={() => {
                        setShowChannelsSidebar(false);
                        setShowAddChannel(true);
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Create Channel
                    </button>
                  </div>
                ) : (
                  channelsArray.map((channel) => (
                    <div
                      key={channel.name}
                      className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        channel.name === activeChannelName
                          ? "bg-primary/10"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => {
                        setActiveChannelName(channel.name);
                        setChannels(prev => {
                          const updated = new Map(prev);
                          const ch = updated.get(channel.name);
                          if (ch) ch.unreadCount = 0;
                          return updated;
                        });
                        setShowChannelsSidebar(false);
                      }}
                    >
                      <Hash className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{channel.name}</p>
                        {channel.unreadCount > 0 && (
                          <span className="text-xs text-primary font-bold">
                            {channel.unreadCount} new messages
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          leaveChannel(channel.name);
                        }}
                        className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                        title="Leave channel"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))
                )}
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
