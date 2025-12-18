"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Lock, Shield, Eye, EyeOff, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PastaLogo } from "@/components/pasta-logo";
import { useLanguage } from "@/components/language-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ChatHome() {
  useLanguage();
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
    
    const params = new URLSearchParams({
      channel: channelName.trim(),
      user: username.trim(),
    });
    
    // Always save password (even if empty) to mark that user went through login
    sessionStorage.setItem(`chat-pwd-${channelName.trim()}`, channelPassword);
    
    router.push(`/chat/room?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Compact on mobile */}
      <header className="border-b border-primary/20 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center justify-between">
          <Link href="https://pastaa.io" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <PastaLogo className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            <span className="font-bold font-righteous text-base md:text-lg">Pastaa</span>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="font-medium text-primary text-sm md:text-base">Chat</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content - Optimized for mobile */}
      <main className="flex-1 flex flex-col px-4 py-6 md:py-12 md:items-center md:justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg space-y-6"
        >
          {/* Hero - Compact on mobile */}
          <div className="text-center space-y-3">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-full bg-primary/10 border-2 border-primary"
            >
              <MessageSquare className="h-7 w-7 md:h-10 md:w-10 text-primary" />
            </motion.div>
            <h1 className="text-3xl md:text-5xl font-bold font-righteous">
              Secure Chat
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
              End-to-end encrypted group chat. No logs.
            </p>
          </div>

          {/* Join Form - Better mobile spacing */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleJoinChannel}
            className="space-y-3 md:space-y-4 bg-card border-2 border-primary/30 rounded-xl md:rounded-2xl p-4 md:p-6"
          >
            {/* Channel Name */}
            <div className="space-y-1.5">
              <label className="text-xs md:text-sm font-medium text-muted-foreground">
                Channel Name
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="my-secret-channel"
                className="w-full px-3 md:px-4 py-2.5 md:py-3 text-base bg-muted border-2 border-transparent focus:border-primary rounded-lg md:rounded-xl outline-none transition-colors"
                required
                autoComplete="off"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs md:text-sm font-medium text-muted-foreground">
                Channel Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={channelPassword}
                  onChange={(e) => setChannelPassword(e.target.value)}
                  placeholder="Optional but recommended"
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 text-base bg-muted border-2 border-transparent focus:border-primary rounded-lg md:rounded-xl outline-none transition-colors pr-11"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
                </button>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Password never leaves your device
              </p>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs md:text-sm font-medium text-muted-foreground">
                Your Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Anonymous"
                className="w-full px-3 md:px-4 py-2.5 md:py-3 text-base bg-muted border-2 border-transparent focus:border-primary rounded-lg md:rounded-xl outline-none transition-colors"
                required
                autoComplete="off"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isJoining || !channelName.trim() || !username.trim()}
              className="w-full py-3 md:py-4 mt-2 bg-primary text-primary-foreground font-bold text-sm md:text-base rounded-lg md:rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isJoining ? (
                <>
                  <div className="h-4 w-4 md:h-5 md:w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 md:h-5 md:w-5" />
                  <span>Join Secure Channel</span>
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                </>
              )}
            </button>
          </motion.form>

          {/* Security Badge - Compact horizontal on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-2 p-3 bg-card/50 rounded-xl border border-primary/20"
          >
            <Shield className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
            <p className="text-xs md:text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Triple Encryption:</span> TLS + AES-256 + ChaCha20-Poly1305
            </p>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer - Compact */}
      <footer className="border-t border-primary/20 py-3 md:py-4">
        <div className="container mx-auto px-4 text-center text-[10px] md:text-xs text-muted-foreground">
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
          </p>
        </div>
      </footer>
    </div>
  );
}
