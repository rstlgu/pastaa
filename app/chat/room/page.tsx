"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Lock,
  LogOut,
  Shield,
  Plus,
  Hash,
  X,
  Eye,
  EyeOff,
  Paperclip,
  Download,
  Flame,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileText,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PastaLogo } from "@/components/pasta-logo";
import { useLanguage } from "@/components/language-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Pusher from "pusher-js";
import {
  generateLayer3KeyPair,
  deriveChatChannelId,
  deriveGroupKey,
  encryptLayer3,
  encryptBytesLayer3,
  decryptLayer3,
  decryptBytesLayer3,
  bytesToHex,
  hexToBytes,
  randomBytes,
  Layer3Keys,
} from "@/lib/chat-crypto";
import { ATTACHMENT_ACCEPT, isAllowedAttachmentMimeType } from "@/lib/allowed-attachments";
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
  file?: ChatFileContent;
  timestamp: Date;
  encrypted: boolean;
  isSystem?: boolean;
}

interface ChatFileContent {
  type: "file";
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  expiresAt: string;
  fileNonce: string;
  description?: string;
  expiresInMs?: number;
}

interface PendingChatFile {
  file: File;
  encryptedBuffer: ArrayBuffer;
  fileNonce: string;
  channelHash: string;
}

interface ImagePreviewState {
  objectUrl?: string;
  isLoading: boolean;
  hasError: boolean;
}

interface ChannelData {
  name: string;
  hash: string;
  groupKey: Uint8Array;
  messages: ChatMessage[];
  members: Map<string, ChatMember>;
  keys: Layer3Keys;
  userId: string;
  isConnected: boolean;
  unreadCount: number;
}

interface SavedChannel {
  name: string;
  hash: string;
  groupKeyHex: string;
}

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
const MAX_CHAT_FILE_SIZE = 10 * 1024 * 1024;
const CHAT_FILE_DEFAULT_EXPIRY_MS = 10 * 60 * 1000;
const CHAT_FILE_EXPIRY_OPTIONS = [
  { label: "30 sec", value: 30 * 1000 },
  { label: "1 min", value: 60 * 1000 },
  { label: "2 min", value: 2 * 60 * 1000 },
  { label: "5 min", value: 5 * 60 * 1000 },
  { label: "10 min", value: CHAT_FILE_DEFAULT_EXPIRY_MS },
] as const;

function getChannelSessionKey(channelName: string): string {
  return `chat-session-${channelName}`;
}

function isSavedChannel(value: unknown): value is SavedChannel {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedChannel>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.hash === "string" &&
    typeof candidate.groupKeyHex === "string"
  );
}

function formatChatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewableChatImage(mimeType: string): boolean {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType.toLowerCase());
}

function isChatArchive(mimeType: string): boolean {
  return [
    "application/zip",
    "application/x-zip-compressed",
    "application/vnd.rar",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/x-tar",
    "application/gzip",
    "application/x-bzip2",
    "application/x-xz",
  ].includes(mimeType.toLowerCase());
}

function formatChatFileType(name: string, mimeType: string): string {
  const extension = name.split(".").pop()?.trim();
  if (extension && extension !== name) return extension.toUpperCase();
  const [, subtype = "file"] = mimeType.split("/");
  return subtype.replace(/^x-/, "").replace(/^vnd\./, "").toUpperCase();
}

function parseChatFileContent(content: string): ChatFileContent | undefined {
  try {
    const parsed = JSON.parse(content) as Partial<ChatFileContent>;
    if (
      parsed.type === "file" &&
      typeof parsed.fileId === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.mimeType === "string" &&
      typeof parsed.size === "number" &&
      typeof parsed.expiresAt === "string" &&
      typeof parsed.fileNonce === "string"
    ) {
      return {
        ...parsed,
        description: typeof parsed.description === "string" ? parsed.description : undefined,
        expiresInMs: typeof parsed.expiresInMs === "number" ? parsed.expiresInMs : undefined,
      } as ChatFileContent;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function ChatRoomContent() {
  const { t } = useLanguage();
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
  const [now, setNow] = useState(Date.now());
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [preparingFileName, setPreparingFileName] = useState("");
  const [downloadingFileId, setDownloadingFileId] = useState("");
  const [pendingChatFile, setPendingChatFile] = useState<PendingChatFile | null>(null);
  const [chatFileExpiryMs, setChatFileExpiryMs] = useState<number>(CHAT_FILE_DEFAULT_EXPIRY_MS);
  const [imagePreviews, setImagePreviews] = useState<Map<string, ImagePreviewState>>(new Map());

  const pusherRef = useRef<Pusher | null>(null);
  const channelRefs = useRef<Map<string, ReturnType<Pusher["subscribe"]>>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewUrlsRef = useRef<Set<string>>(new Set());

  // Get active channel data
  const activeChannel = channels.get(activeChannelName);

  // Save channels to sessionStorage
  const saveChannelsToStorage = useCallback((channelsMap: Map<string, ChannelData>) => {
    const savedChannels: SavedChannel[] = Array.from(channelsMap.values()).map(ch => ({
      name: ch.name,
      hash: ch.hash,
      groupKeyHex: bytesToHex(ch.groupKey),
    }));
    sessionStorage.setItem('chat-channels', JSON.stringify(savedChannels));
  }, []);

  // Load channels from sessionStorage
  const loadChannelsFromStorage = useCallback((): SavedChannel[] => {
    const saved = sessionStorage.getItem('chat-channels');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isSavedChannel);
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

    // Check if user has derived the room key in the join screen.
    const hasLoggedIn = sessionStorage.getItem(getChannelSessionKey(initialChannelName)) !== null;
    
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
  }, [activeChannel?.messages, activeChannel?.messages.length, activeChannel?.name]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const previewUrls = imagePreviewUrlsRef.current;
    return () => {
      previewUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      previewUrls.clear();
    };
  }, []);

  useEffect(() => {
    setPendingChatFile(null);
    setPreparingFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [activeChannelName]);

  // Connect to a channel
  const connectToChannel = useCallback(async (channelName: string, hash: string, groupKey: Uint8Array) => {
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
      const userId = `user-${bytesToHex(randomBytes(9))}`;

      if (!PUSHER_KEY || !PUSHER_CLUSTER) {
        const channelData: ChannelData = {
          name: channelName,
          hash,
          groupKey,
          messages: [{
            id: `system-config-${channelName}`,
            from: "system",
            fromUsername: "System",
            content: t("realtimeNotConfigured"),
            timestamp: new Date(),
            encrypted: false,
            isSystem: true,
          }],
          members: new Map(),
          keys,
          userId,
          isConnected: false,
          unreadCount: 0,
        };

        setChannels(prev => {
          const updated = new Map(prev);
          updated.set(channelName, channelData);
          saveChannelsToStorage(updated);
          return updated;
        });
        setActiveChannelName(channelName);
        return;
      }

      // Initialize Pusher if needed
      if (!pusherRef.current) {
        pusherRef.current = new Pusher(PUSHER_KEY, {
          cluster: PUSHER_CLUSTER,
          authEndpoint: "/api/chat/auth",
        });
      }

      // Subscribe to channel
      const pusherChannel = pusherRef.current.subscribe(`private-chat-${hash}`);
      channelRefs.current.set(channelName, pusherChannel);

      // Create channel data
      const channelData: ChannelData = {
        name: channelName,
        hash,
        groupKey,
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
              msg.isSystem && msg.content.includes(`#${channelName}`)
            );
            
            if (!hasWelcomeMessage) {
              ch.messages.push({
                id: `system-welcome-${channelName}-${userId}`,
                from: "system",
                fromUsername: "System",
                content: `${t("welcomeToChannel")} #${channelName}. ${t("welcomeEncrypted")}`,
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
          let content = t("encryptedWrongPassword");
          let decryptionFailed = true;
          
          try {
            const decryptedContent = decryptLayer3(data.encryptedContent, data.nonce, ch.groupKey);
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
            file: decryptionFailed ? undefined : parseChatFileContent(content),
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
              content: `${data.username} ${t("joinedChannel")}`,
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
              content: `${member.username} ${t("leftChannel")}`,
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
  }, [channels, username, activeChannelName, saveChannelsToStorage, t]);

  // Load saved channels on mount
  useEffect(() => {
    if (!isReady) return;

    const savedChannels = loadChannelsFromStorage();
    
    // If we have the initial channel, add it if not in saved
    if (initialChannelName) {
      const sessionValue = sessionStorage.getItem(getChannelSessionKey(initialChannelName));
      let initialSession: SavedChannel | null = null;
      if (sessionValue) {
        try {
          const parsed = JSON.parse(sessionValue);
          initialSession = isSavedChannel(parsed) ? parsed : null;
        } catch {
          initialSession = null;
        }
      }
      
      const hasChannel = savedChannels.some(ch => ch.name === initialChannelName);
      if (!hasChannel && initialSession) {
        savedChannels.unshift(initialSession);
      }

      // Connect to initial channel
      if (initialSession) {
        connectToChannel(initialChannelName, initialSession.hash, hexToBytes(initialSession.groupKeyHex));
      }
    }

    // Connect to other saved channels
    savedChannels.forEach(ch => {
      if (ch.name !== initialChannelName) {
        setTimeout(() => connectToChannel(ch.name, ch.hash, hexToBytes(ch.groupKeyHex)), 100);
      }
    });
  }, [isReady]);

  // Send message to active channel
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !activeChannel || !activeChannel.isConnected) return;

    const messageId = `msg-${Date.now()}-${bytesToHex(randomBytes(9))}`;
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
    const { ciphertext, nonce } = encryptLayer3(content, activeChannel.groupKey);

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

  const sendEncryptedFile = useCallback(async (pendingFile: PendingChatFile, description: string, expiresInMs: number) => {
    if (!activeChannel || !activeChannel.isConnected) return;
    const { file } = pendingFile;

    if (pendingFile.channelHash !== activeChannel.hash) {
      setPendingChatFile(null);
      alert(t("channelChangedAttachmentRemoved"));
      return;
    }

    if (!isAllowedAttachmentMimeType(file.type)) {
      alert(t("unsupportedChatFileFormat"));
      return;
    }

    if (file.size > MAX_CHAT_FILE_SIZE) {
      alert(t("fileTooLargeMax10Mb"));
      return;
    }

    const messageId = `msg-${Date.now()}-${bytesToHex(randomBytes(9))}`;
    setUploadingFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("channelHash", activeChannel.hash);
      formData.append("mimeType", file.type || "application/octet-stream");
      formData.append("expiresInMs", String(expiresInMs));
      formData.append("file", new Blob([pendingFile.encryptedBuffer], { type: file.type || "application/octet-stream" }));

      const uploadResponse = await fetch("/api/chat/file", {
        method: "POST",
        body: formData,
      });
      const uploadData = (await uploadResponse.json().catch(() => ({}))) as {
        fileId?: string;
        expiresAt?: string;
        error?: string;
      };

      if (!uploadResponse.ok || !uploadData.fileId || !uploadData.expiresAt) {
        throw new Error(uploadData.error || t("fileUploadFailed"));
      }

      const fileContent: ChatFileContent = {
        type: "file",
        fileId: uploadData.fileId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        expiresAt: uploadData.expiresAt,
        fileNonce: pendingFile.fileNonce,
        description: description || undefined,
        expiresInMs,
      };
      const content = JSON.stringify(fileContent);

      setChannels(prev => {
        const updated = new Map(prev);
        const ch = updated.get(activeChannelName);
        if (ch) {
          ch.messages.push({
            id: messageId,
            from: ch.userId,
            fromUsername: username,
            content,
            file: fileContent,
            timestamp: new Date(),
            encrypted: true,
          });
        }
        return updated;
      });

      const { ciphertext, nonce } = encryptLayer3(content, activeChannel.groupKey);
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

      setInputMessage("");
      setPendingChatFile(null);
    } catch (error) {
      console.error("Error sending encrypted file:", error);
      alert(error instanceof Error ? error.message : t("fileSendFailed"));
    } finally {
      setUploadingFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [activeChannel, activeChannelName, username, t]);

  const handleChatSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannel?.isConnected || uploadingFileName || preparingFileName) return;

    if (pendingChatFile) {
      await sendEncryptedFile(pendingChatFile, inputMessage.trim(), chatFileExpiryMs);
      return;
    }

    await sendMessage();
  }, [
    activeChannel?.isConnected,
    chatFileExpiryMs,
    inputMessage,
    pendingChatFile,
    preparingFileName,
    sendEncryptedFile,
    sendMessage,
    uploadingFileName,
  ]);

  const handlePendingFileChange = useCallback(async (file: File) => {
    if (!activeChannel) return;

    if (!isAllowedAttachmentMimeType(file.type)) {
      alert(t("unsupportedChatFileFormat"));
      return;
    }

    if (file.size > MAX_CHAT_FILE_SIZE) {
      alert(t("fileTooLargeMax10Mb"));
      return;
    }

    setPreparingFileName(file.name);

    try {
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      const encryptedFile = encryptBytesLayer3(fileBytes, activeChannel.groupKey);
      const encryptedBuffer = encryptedFile.ciphertext.buffer.slice(
        encryptedFile.ciphertext.byteOffset,
        encryptedFile.ciphertext.byteOffset + encryptedFile.ciphertext.byteLength
      ) as ArrayBuffer;

      setPendingChatFile({
        file,
        encryptedBuffer,
        fileNonce: encryptedFile.nonce,
        channelHash: activeChannel.hash,
      });
    } catch (error) {
      console.error("Error encrypting file:", error);
      alert(t("fileEncryptionFailed"));
    } finally {
      setPreparingFileName("");
    }
  }, [activeChannel, t]);

  const downloadEncryptedFile = useCallback(async (file: ChatFileContent, groupKey: Uint8Array) => {
    if (Date.parse(file.expiresAt) <= Date.now()) return;

    setDownloadingFileId(file.fileId);
    try {
      const response = await fetch(`/api/chat/file/${file.fileId}`);
      if (!response.ok) {
        throw new Error(response.status === 410 ? t("fileDestroyed") : t("downloadFailed"));
      }

      const encryptedBytes = new Uint8Array(await response.arrayBuffer());
      const decryptedBytes = decryptBytesLayer3(encryptedBytes, file.fileNonce, groupKey);
      const decryptedBuffer = decryptedBytes.buffer.slice(
        decryptedBytes.byteOffset,
        decryptedBytes.byteOffset + decryptedBytes.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([decryptedBuffer], { type: file.mimeType || "application/octet-stream" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Error downloading encrypted file:", error);
      alert(error instanceof Error ? error.message : t("downloadFailed"));
    } finally {
      setDownloadingFileId("");
    }
  }, [t]);

  const revealEncryptedImage = useCallback(async (file: ChatFileContent, groupKey: Uint8Array) => {
    if (!isPreviewableChatImage(file.mimeType) || Date.parse(file.expiresAt) <= Date.now()) return;

    const currentPreview = imagePreviews.get(file.fileId);
    if (currentPreview?.objectUrl || currentPreview?.isLoading) return;

    setImagePreviews(prev => {
      const updated = new Map(prev);
      updated.set(file.fileId, { isLoading: true, hasError: false });
      return updated;
    });

    try {
      const response = await fetch(`/api/chat/file/${file.fileId}`);
      if (!response.ok) throw new Error(response.status === 410 ? t("fileDestroyed") : t("downloadFailed"));

      const encryptedBytes = new Uint8Array(await response.arrayBuffer());
      const decryptedBytes = decryptBytesLayer3(encryptedBytes, file.fileNonce, groupKey);
      const decryptedBuffer = decryptedBytes.buffer.slice(
        decryptedBytes.byteOffset,
        decryptedBytes.byteOffset + decryptedBytes.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([decryptedBuffer], { type: file.mimeType });
      const objectUrl = URL.createObjectURL(blob);
      imagePreviewUrlsRef.current.add(objectUrl);

      setImagePreviews(prev => {
        const updated = new Map(prev);
        updated.set(file.fileId, { objectUrl, isLoading: false, hasError: false });
        return updated;
      });
    } catch (error) {
      console.error("Error revealing encrypted image:", error);
      setImagePreviews(prev => {
        const updated = new Map(prev);
        updated.set(file.fileId, { isLoading: false, hasError: true });
        return updated;
      });
    }
  }, [imagePreviews, t]);

  // Add new channel
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const channelName = newChannelName.trim();
    const password = newChannelPassword;
    if (!password) return;

    const hash = await deriveChatChannelId(channelName, password);
    const groupKey = await deriveGroupKey(channelName, password);
    const session: SavedChannel = {
      name: channelName,
      hash,
      groupKeyHex: bytesToHex(groupKey),
    };
    sessionStorage.setItem(getChannelSessionKey(channelName), JSON.stringify(session));

    // Connect to channel
    await connectToChannel(channelName, hash, groupKey);

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

    // Remove derived room material for this browser session.
    sessionStorage.removeItem(getChannelSessionKey(channelName));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Notify server and cleanup all channels
      // Note: we can't access current 'channels' state here due to closure
      // but we should attempt best-effort cleanup if we had refs
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
                  <h3 className="font-medium">{t("channels")} ({channelsArray.length})</h3>
                  <button
                    onClick={() => setShowAddChannel(true)}
                    className="p-1.5 hover:bg-primary/10 rounded-md transition-colors"
                    title={t("addChannel")}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {channelsArray.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t("noChannelsYet")}</p>
                      <button
                        onClick={() => setShowAddChannel(true)}
                        className="mt-3 text-xs text-primary hover:underline"
                      >
                        {t("createOne")}
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
                              {channel.unreadCount} {t("newMessages")}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            leaveChannel(channel.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                          title={t("leaveChannel")}
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
            <div className="flex-1 overflow-y-auto p-4 chat-scrollbar relative">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
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
                          {msg.file ? (
                            (() => {
                              const remainingMs = Math.max(0, Date.parse(msg.file.expiresAt) - now);
                              const isExpired = remainingMs === 0;
                              const fileExpiryMs = msg.file.expiresInMs ?? CHAT_FILE_DEFAULT_EXPIRY_MS;
                              const progress = Math.max(0, Math.min(100, (remainingMs / fileExpiryMs) * 100));
                              const minutes = Math.floor(remainingMs / 60000);
                              const seconds = Math.floor((remainingMs % 60000) / 1000);
                              const fileFormat = formatChatFileType(msg.file.name, msg.file.mimeType);
                              const isImage = isPreviewableChatImage(msg.file.mimeType);
                              const isArchive = isChatArchive(msg.file.mimeType);
                              const isTextFile = msg.file.mimeType.startsWith("text/");
                              const imagePreview = imagePreviews.get(msg.file.fileId);

                              return (
                                <div className="w-72 max-w-full space-y-2">
                                  <div className="flex items-start gap-2">
                                    <motion.div
                                      animate={isExpired ? { scale: [1, 1.2, 1], rotate: [0, -8, 8, 0] } : { scale: [1, 1.05, 1] }}
                                      transition={{ duration: isExpired ? 0.8 : 2, repeat: Infinity }}
                                      className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                                        isExpired ? "bg-destructive/20 text-destructive" : "bg-background/30"
                                      }`}
                                    >
                                      {isExpired ? (
                                        <Flame className="h-4 w-4" />
                                      ) : isImage ? (
                                        <FileImage className="h-4 w-4" />
                                      ) : isArchive ? (
                                        <FileArchive className="h-4 w-4" />
                                      ) : isTextFile ? (
                                        <FileText className="h-4 w-4" />
                                      ) : (
                                        <FileIcon className="h-4 w-4" />
                                      )}
                                    </motion.div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-semibold">
                                        {isExpired ? t("fileDestroyed") : msg.file.name}
                                      </p>
                                      <p className="text-xs opacity-70">
                                        {fileFormat} • {formatChatFileSize(msg.file.size)} •{" "}
                                        {isExpired
                                          ? t("fileBurned")
                                          : `${minutes}:${seconds.toString().padStart(2, "0")}`}
                                      </p>
                                    </div>
                                  </div>
                                  {msg.file.description && (
                                    <p className="break-words text-sm">
                                      {msg.file.description}
                                    </p>
                                  )}
                                  {isImage && !isExpired && (
                                    <motion.button
                                      type="button"
                                      whileTap={{ scale: 0.98 }}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        if (imagePreview?.objectUrl) {
                                          URL.revokeObjectURL(imagePreview.objectUrl);
                                          imagePreviewUrlsRef.current.delete(imagePreview.objectUrl);
                                          setImagePreviews(prev => {
                                            const updated = new Map(prev);
                                            updated.delete(msg.file!.fileId);
                                            return updated;
                                          });
                                          return;
                                        }
                                        void revealEncryptedImage(msg.file!, activeChannel.groupKey);
                                      }}
                                      className="group relative block aspect-video w-full overflow-hidden rounded-xl border border-current/15 bg-background/20 text-left"
                                    >
                                      {imagePreview?.objectUrl ? (
                                        <>
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={imagePreview.objectUrl}
                                            alt={msg.file.name}
                                            className="h-full w-full object-cover"
                                          />
                                          <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                                            {t("hideImage")}
                                          </span>
                                        </>
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center overflow-hidden">
                                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.45),transparent_28%),linear-gradient(135deg,rgba(0,0,0,0.12),rgba(255,255,255,0.18))] blur-sm" />
                                          <div className="absolute inset-0 backdrop-blur-md" />
                                          <div className="relative z-10 flex flex-col items-center gap-1 text-center">
                                            <FileImage className="h-6 w-6 opacity-80" />
                                            <span className="text-xs font-semibold">
                                              {imagePreview?.isLoading
                                                ? t("imagePreviewLoading")
                                                : imagePreview?.hasError
                                                  ? t("imagePreviewFailed")
                                                  : t("revealImage")}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </motion.button>
                                  )}
                                  <div className="h-1.5 overflow-hidden rounded-full bg-background/30">
                                    <motion.div
                                      className={`h-full ${isExpired ? "bg-destructive" : "bg-primary"}`}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ duration: 0.4 }}
                                    />
                                  </div>
                                  <AnimatePresence mode="wait">
                                    {isExpired ? (
                                      <motion.div
                                        key="burned"
                                        initial={{ opacity: 0, scale: 0.92 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                                      >
                                        {t("attachmentDestroyed")}
                                      </motion.div>
                                    ) : (
                                      <motion.button
                                        key="download"
                                        type="button"
                                        whileTap={{ scale: 0.97 }}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          downloadEncryptedFile(msg.file!, activeChannel.groupKey);
                                        }}
                                        disabled={downloadingFileId === msg.file.fileId}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-current/20 bg-background/20 px-3 py-2 text-xs font-semibold transition-colors hover:bg-background/30 disabled:opacity-50"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                        {downloadingFileId === msg.file.fileId ? t("downloadInProgress") : t("downloadAndDecrypt")}
                                      </motion.button>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })()
                          ) : (
                            <p className="break-words text-sm">{msg.content}</p>
                          )}
                          
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
            </div>

            {/* Message input with fade effect */}
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-background/30 to-background/90 pointer-events-none" />
              <form onSubmit={handleChatSubmit} className="p-3 md:p-4 bg-transparent relative">
                <div className="mx-auto w-full max-w-4xl space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ATTACHMENT_ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handlePendingFileChange(file);
                      event.currentTarget.value = "";
                    }}
                    disabled={!activeChannel.isConnected || Boolean(uploadingFileName) || Boolean(preparingFileName)}
                  />
                  <AnimatePresence>
                    {pendingChatFile && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="rounded-2xl border-2 border-primary/20 bg-card/95 p-3 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Paperclip className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{pendingChatFile.file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatChatFileSize(pendingChatFile.file.size)} • {t("encryptedLocally")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-muted-foreground" htmlFor="chat-file-expiry">
                              {t("attachmentExpires")}
                            </label>
                            <select
                              id="chat-file-expiry"
                              value={chatFileExpiryMs}
                              onChange={(event) => setChatFileExpiryMs(Number(event.target.value))}
                              className="rounded-lg border border-primary/20 bg-background px-2 py-1.5 text-xs outline-none transition-colors focus:border-primary"
                              disabled={Boolean(uploadingFileName)}
                            >
                              {CHAT_FILE_EXPIRY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setPendingChatFile(null)}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                              title={t("removeAttachment")}
                              disabled={Boolean(uploadingFileName)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="relative flex items-center">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={
                      activeChannel.isConnected
                        ? pendingChatFile
                          ? t("attachmentDescriptionPlaceholder")
                          : t("typeMessage")
                        : t("connectingRealtime")
                    }
                    className="w-full pl-12 pr-14 py-3 bg-muted border-2 border-transparent focus:border-primary rounded-full outline-none transition-colors text-base"
                    disabled={!activeChannel.isConnected || Boolean(uploadingFileName) || Boolean(preparingFileName)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!activeChannel.isConnected || Boolean(uploadingFileName) || Boolean(preparingFileName)}
                    className="absolute left-1.5 h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-background/70 hover:text-foreground transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                    title={t("encryptedAttachmentTitle")}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={
                      (!inputMessage.trim() && !pendingChatFile) ||
                      !activeChannel.isConnected ||
                      Boolean(uploadingFileName) ||
                      Boolean(preparingFileName)
                    }
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
              </div>
                {!activeChannel.isConnected && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {t("waitingRealtime")}
                  </p>
                )}
                {uploadingFileName && (
                  <p className="mt-2 text-center text-xs text-primary">
                    {t("encryptedUploadOf")} {uploadingFileName}...
                  </p>
                )}
                {preparingFileName && (
                  <p className="mt-2 text-center text-xs text-primary">
                    {t("localEncryptionOf")} {preparingFileName}...
                  </p>
                )}
            </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div>
              <Hash className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("noChannelSelected")}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("selectOrCreateChannel")}
              </p>
              <button
                onClick={() => setShowAddChannel(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t("createChannel")}
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
                <h3 className="font-medium mb-3">{t("members")} ({membersArray.length + 1})</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${getUserColor(username)}`}>
                      {getInitials(username)}
                    </div>
                    <span className="text-sm font-medium">{username}</span>
                    <span className="text-xs text-muted-foreground">({t("you")})</span>
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
                <h2 className="text-xl font-bold mb-4">{t("joinNewChannel")}</h2>
                <form onSubmit={handleAddChannel} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                      {t("channelName")}
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
                      {t("channelPassword")}
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newChannelPassword}
                        onChange={(e) => setNewChannelPassword(e.target.value)}
                        placeholder={t("requiredForE2E")}
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
                      {t("cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={!newChannelName.trim() || !newChannelPassword}
                      className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("joinChannel")}
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
              <h3 className="font-medium mb-4">{t("members")} ({membersArray.length + 1})</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${getUserColor(username)}`}>
                    {getInitials(username)}
                  </div>
                  <div>
                    <span className="font-medium">{username}</span>
                    <p className="text-xs text-muted-foreground">{t("you")}</p>
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
                <h3 className="font-medium">{t("channels")} ({channelsArray.length})</h3>
                <button
                  onClick={() => {
                    setShowChannelsSidebar(false);
                    setShowAddChannel(true);
                  }}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                  title={t("addChannel")}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                {channelsArray.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Hash className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="mb-3">{t("noChannelsYet")}</p>
                    <button
                      onClick={() => {
                        setShowChannelsSidebar(false);
                        setShowAddChannel(true);
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {t("createChannel")}
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
                            {channel.unreadCount} {t("newMessagesLong")}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          leaveChannel(channel.name);
                        }}
                        className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                        title={t("leaveChannel")}
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
  const { t } = useLanguage();

  return (
    <Suspense fallback={
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <PastaLogo className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    }>
      <ChatRoomContent />
    </Suspense>
  );
}
