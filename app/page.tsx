"use client";

import { motion } from "framer-motion";
import { Send, Share2, MessageSquare, Github, Lock, Code, FileText, Users, Zap, Smartphone, Shield, Server, Clock } from "lucide-react";
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

                {/* Feature Buttons - Premium style */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col md:flex-row gap-4 md:gap-6 max-w-md md:max-w-3xl mx-auto w-full px-4 md:px-0"
                >
                  {/* Send Button/Card */}
                  <Link href="/send" className="w-full group">
                    <motion.div
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      className="relative w-full overflow-hidden"
                    >
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {/* Card content */}
                      <div className="relative p-5 md:p-8 rounded-2xl border-2 border-primary/50 group-hover:border-primary bg-card/80 backdrop-blur-sm transition-all duration-300 group-hover:shadow-[0_0_40px_rgba(234,179,8,0.3)]">
                        <div className="flex items-center gap-4 md:flex-col md:text-center md:gap-6">
                          {/* Icon with animated ring */}
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-0 group-hover:opacity-75" style={{ animationDuration: '2s' }} />
                            <div className="relative p-3 md:p-5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full border border-primary/30 group-hover:border-primary transition-colors">
                              <Send className="h-6 w-6 md:h-10 md:w-10 text-primary" />
                            </div>
                          </div>
                          
                          {/* Text */}
                          <div className="flex-1 md:space-y-3">
                            <h3 className="text-xl md:text-3xl font-bold font-righteous text-foreground group-hover:text-primary transition-colors">
                              Send
                            </h3>
                            <p className="hidden md:block text-base text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                              {t('sendDescription')}
                            </p>
                            <p className="md:hidden text-xs text-muted-foreground">
                              E2E Encrypted
                            </p>
                          </div>
                          
                          {/* Arrow indicator - mobile only */}
                          <div className="md:hidden">
                            <svg className="h-5 w-5 text-primary/50 group-hover:text-primary group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>

                  {/* Share Button/Card */}
                  <Link href={`/${Math.random().toString(36).slice(2, 10)}`} className="w-full group">
                    <motion.div
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      className="relative w-full overflow-hidden"
                    >
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {/* Card content */}
                      <div className="relative p-5 md:p-8 rounded-2xl border-2 border-primary/50 group-hover:border-primary bg-card/80 backdrop-blur-sm transition-all duration-300 group-hover:shadow-[0_0_40px_rgba(234,179,8,0.3)]">
                        <div className="flex items-center gap-4 md:flex-col md:text-center md:gap-6">
                          {/* Icon with animated ring */}
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-0 group-hover:opacity-75" style={{ animationDuration: '2s' }} />
                            <div className="relative p-3 md:p-5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full border border-primary/30 group-hover:border-primary transition-colors">
                              <Share2 className="h-6 w-6 md:h-10 md:w-10 text-primary" />
                            </div>
                          </div>
                          
                          {/* Text */}
                          <div className="flex-1 md:space-y-3">
                            <h3 className="text-xl md:text-3xl font-bold font-righteous text-foreground group-hover:text-primary transition-colors">
                              Share
                            </h3>
                            <p className="hidden md:block text-base text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                              {t('shareDescription')}
                            </p>
                            <p className="md:hidden text-xs text-muted-foreground">
                              Real-time Collab
                            </p>
                          </div>
                          
                          {/* Arrow indicator - mobile only */}
                          <div className="md:hidden">
                            <svg className="h-5 w-5 text-primary/50 group-hover:text-primary group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>

                  {/* Chat Button/Card */}
                  <a href="https://chat.pastaa.io" className="w-full group">
                    <motion.div
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      className="relative w-full overflow-hidden"
                    >
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {/* Card content */}
                      <div className="relative p-5 md:p-8 rounded-2xl border-2 border-primary/50 group-hover:border-primary bg-card/80 backdrop-blur-sm transition-all duration-300 group-hover:shadow-[0_0_40px_rgba(234,179,8,0.3)]">
                        <div className="flex items-center gap-4 md:flex-col md:text-center md:gap-6">
                          {/* Icon with animated ring */}
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-0 group-hover:opacity-75" style={{ animationDuration: '2s' }} />
                            <div className="relative p-3 md:p-5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full border border-primary/30 group-hover:border-primary transition-colors">
                              <MessageSquare className="h-6 w-6 md:h-10 md:w-10 text-primary" />
                            </div>
                          </div>
                          
                          {/* Text */}
                          <div className="flex-1 md:space-y-3">
                            <h3 className="text-xl md:text-3xl font-bold font-righteous text-foreground group-hover:text-primary transition-colors">
                              Chat
                            </h3>
                            <p className="hidden md:block text-base text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                              Secure group chat with triple encryption
                            </p>
                            <p className="md:hidden text-xs text-muted-foreground">
                              E2E Group Chat
                            </p>
                          </div>
                          
                          {/* Arrow indicator - mobile only */}
                          <div className="md:hidden">
                            <svg className="h-5 w-5 text-primary/50 group-hover:text-primary group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </a>
                </motion.div>
              </div>

            {/* Features List */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap justify-center gap-3 md:gap-6 text-xs md:text-sm text-muted-foreground mt-2 md:mt-12"
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
                <Users className="h-4 w-4 text-primary" />
                <span>Real-time Collaboration</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span>Fast & Lightweight</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>Mobile Friendly</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>Privacy First</span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                <span>Self Hostable</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>No Registration</span>
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

      {/* Created by section - Hidden for now */}
      {/* <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="border-t border-primary/20 py-6 bg-card/50"
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              Created by{' '}
              <Link 
                href="https://rstlgu.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                rstlgu
              </Link>
              . For help and support shoot me an{' '}
              <Link 
                href="mailto:support@pastaa.io"
                className="text-primary hover:text-primary/80 transition-colors font-medium inline-flex items-center gap-1"
              >
                <Mail className="h-3 w-3" />
                email
              </Link>
              .
            </p>
            <Link 
              href="/donate"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Coffee className="h-4 w-4" />
              Support me with a coffee
            </Link>
          </div>
        </div>
      </motion.section> */}

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
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
