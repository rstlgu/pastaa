"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Lock, Users, Zap, Shield, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PastaLogo } from "@/components/pasta-logo";
import { useLanguage } from "@/components/language-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ChatHome() {
  useLanguage(); // Hook per il contesto
  const router = useRouter();
  const [channelName, setChannelName] = useState("");
  const [channelPassword, setChannelPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || !username.trim()) return;

    setIsJoining(true);
    
    // Encode channel info in URL
    const params = new URLSearchParams({
      channel: channelName.trim(),
      user: username.trim(),
    });
    
    // Password is stored in session, never sent to server
    if (channelPassword) {
      sessionStorage.setItem(`chat-pwd-${channelName.trim()}`, channelPassword);
    }
    
    router.push(`/chat/room?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-primary/20 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <PastaLogo className="h-7 w-7 text-primary" />
            <span className="font-bold font-righteous text-lg">Pastaa</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-primary">Chat</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg space-y-8"
        >
          {/* Hero */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary mb-4"
            >
              <MessageSquare className="h-10 w-10 text-primary" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold font-righteous">
              Secure Chat
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              End-to-end encrypted group chat. No databases, no accounts, no logs.
              Triple-layer encryption for maximum privacy.
            </p>
          </div>

          {/* Join Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleJoinChannel}
            className="space-y-4 bg-card border-2 border-primary/30 rounded-2xl p-6"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Channel Name
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="my-secret-channel"
                className="w-full px-4 py-3 bg-muted border-2 border-transparent focus:border-primary rounded-xl outline-none transition-colors"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Channel Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={channelPassword}
                  onChange={(e) => setChannelPassword(e.target.value)}
                  placeholder="Optional but recommended"
                  className="w-full px-4 py-3 bg-muted border-2 border-transparent focus:border-primary rounded-xl outline-none transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Password never leaves your device. Different passwords = different encryption keys.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Your Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Anonymous"
                className="w-full px-4 py-3 bg-muted border-2 border-transparent focus:border-primary rounded-xl outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isJoining || !channelName.trim() || !username.trim()}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Join Secure Channel
                </>
              )}
            </button>
          </motion.form>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="flex items-center gap-3 p-4 bg-card/50 rounded-xl border border-primary/20">
              <Shield className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Triple Encryption</p>
                <p className="text-xs text-muted-foreground">TLS + AES + ChaCha20</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card/50 rounded-xl border border-primary/20">
              <Users className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Group Chat</p>
                <p className="text-xs text-muted-foreground">E2E with each member</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card/50 rounded-xl border border-primary/20">
              <Zap className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Real-time</p>
                <p className="text-xs text-muted-foreground">Nothing stored ever</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card/50 rounded-xl border border-primary/20">
              <Lock className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Zero Knowledge</p>
                <p className="text-xs text-muted-foreground">Server can&apos;t read</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-primary/20 py-4">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>
            Inspired by{" "}
            <a
              href="https://www.chatcrypt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              ChatCrypt
            </a>
            . Built with the same security principles.
          </p>
        </div>
      </footer>
    </div>
  );
}

