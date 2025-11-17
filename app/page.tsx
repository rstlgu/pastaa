"use client";

import { motion } from "framer-motion";
import { Send, Share2, Github, Lock, Code, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PastaLogo } from "@/components/pasta-logo";
import { useLanguage } from "@/components/language-provider";
import { GitHubBadge } from "@/components/github-badge";
import { AuroraBackground } from "@/components/ui/aurora-background";
import Link from "next/link";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Theme Toggle - Fixed top right */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <div className="bg-card/80 backdrop-blur-sm rounded-full">
          <GitHubBadge />
        </div>
        <div className="bg-card/80 backdrop-blur-sm rounded-full">
          <ThemeToggle />
        </div>
      </div>

      {/* Hero Section */}
      <AuroraBackground className="flex-1">
        <div className="flex-1 flex flex-col justify-center px-4 py-8 md:py-12 w-full relative z-10">
          <div className="max-w-4xl w-full mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center space-y-8 relative z-10"
            >
              {/* Title with logo - Centered on mobile */}
              <div className="space-y-6 md:space-y-8 min-h-[65vh] md:min-h-0 flex flex-col justify-center">
                <div className="space-y-4 md:space-y-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-4"
                  >
                    <PastaLogo className="h-20 w-20 md:h-28 md:w-28 text-primary" />
                    <h1 className="text-6xl md:text-8xl font-bold font-righteous text-foreground">
                      Pastaa
                    </h1>
                  </motion.div>
                  
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-base md:text-2xl text-muted-foreground max-w-2xl mx-auto px-4"
                  >
                    {t('heroSubtitle')}
                  </motion.p>
                </div>

                {/* Feature Buttons - Mobile inline, Desktop cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6 max-w-md md:max-w-3xl mx-auto w-full px-4 md:px-0"
                >
                  {/* Send Button/Card */}
                  <Link href="/send" className="w-full">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full p-3 md:p-8 rounded-xl md:rounded-2xl border-2 border-primary bg-primary/10 hover:bg-primary/20 md:border-primary/30 md:bg-card md:hover:border-primary transition-all cursor-pointer"
                    >
                      {/* Mobile: Button layout */}
                      <div className="flex md:hidden flex-col items-center justify-center gap-2">
                        <Send className="h-5 w-5 text-primary" />
                        <span className="text-sm font-bold font-righteous">Send</span>
                      </div>
                      
                      {/* Desktop: Card layout */}
                      <div className="hidden md:flex flex-col items-center text-center space-y-4">
                        <div className="p-4 bg-primary/10 rounded-full">
                          <Send className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold font-righteous">Send</h3>
                        <p className="text-base text-muted-foreground">
                          {t('sendDescription')}
                        </p>
                      </div>
                    </motion.div>
                  </Link>

                  {/* Share Button/Card */}
                  <Link href={`/${Math.random().toString(36).slice(2, 10)}`} className="w-full">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full p-3 md:p-8 rounded-xl md:rounded-2xl border-2 border-primary bg-primary/10 hover:bg-primary/20 md:border-primary/30 md:bg-card md:hover:border-primary transition-all cursor-pointer"
                    >
                      {/* Mobile: Button layout */}
                      <div className="flex md:hidden flex-col items-center justify-center gap-2">
                        <Share2 className="h-5 w-5 text-primary" />
                        <span className="text-sm font-bold font-righteous">Share</span>
                      </div>
                      
                      {/* Desktop: Card layout */}
                      <div className="hidden md:flex flex-col items-center text-center space-y-4">
                        <div className="p-4 bg-primary/10 rounded-full">
                          <Share2 className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold font-righteous">Share</h3>
                        <p className="text-base text-muted-foreground">
                          {t('shareDescription')}
                        </p>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              </div>

            {/* Features List */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap justify-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground mt-4 md:mt-12"
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span>E2E Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" />
                <span>Syntax Highlighting</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Rich Text Editor</span>
              </div>
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-primary" />
                <span>Open Source</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
        </div>
      </AuroraBackground>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="border-t border-primary/20 py-6"
      >
        <div className="container mx-auto px-4">
          {/* Links - Una riga su desktop, centrati */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground/70 transition-colors">
              {t('privacyPolicy')}
            </Link>
            <Link href="/terms" className="hover:text-foreground/70 transition-colors">
              {t('termsOfService')}
            </Link>
          </div>
        </div>
      </motion.footer>

    </div>
  );
}
