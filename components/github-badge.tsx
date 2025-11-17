"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Github, ExternalLink, Code, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

interface GitHubBadgeProps {
  show?: boolean;
  onClose?: () => void;
}

export function GitHubBadge({ show: showProp, onClose }: GitHubBadgeProps) {
  const { t } = useLanguage();
  const [showDesktopCard, setShowDesktopCard] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleClick = () => {
    // Solo su mobile apri il bottom sheet
    if (isMobile) {
      setShowMobileSheet(true);
    }
  };

  const handleMouseEnter = () => {
    // Solo su desktop mostra hover card
    if (!isMobile) {
      setShowDesktopCard(true);
    }
  };

  const handleClose = () => {
    setShowMobileSheet(false);
    onClose?.();
  };

  // Usa showProp se fornito (per retrocompatibilità), altrimenti usa lo stato interno
  const show = showProp !== undefined ? showProp : showMobileSheet;

  return (
    <div className="relative">
      {/* Pulsante GitHub */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowDesktopCard(false)}
        className="inline-flex items-center justify-center rounded-full border-2 border-primary bg-background hover:bg-muted h-10 w-10 transition-colors"
      >
        <Github className="h-5 w-5" />
      </motion.button>
      {/* Desktop Hover Card */}
      <AnimatePresence>
        {showDesktopCard && !isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="hidden md:block absolute top-full right-0 mt-2 w-96 z-50"
            onMouseEnter={() => setShowDesktopCard(true)}
            onMouseLeave={() => setShowDesktopCard(false)}
          >
            <div className="bg-card border-2 border-primary rounded-xl shadow-2xl p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/20 border-2 border-primary rounded-full flex-shrink-0">
                  <Github className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t('openSourceTitle')}</h3>
                  <p className="text-xs text-muted-foreground">{t('openSourceSubtitle')}</p>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3">
                {/* Features */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                    <Code className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs mb-1">{t('openSourceCodeTitle')}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t('openSourceCodeDesc')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                    <Server className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs mb-1">{t('selfHostableTitle')}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t('selfHostableDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* GitHub Link */}
                <a 
                  href="https://github.com/rstlgu/pastaa.git" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors border-2 border-primary/30"
                >
                  <Github className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-xs">github.com/rstlgu/pastaa</span>
                  <ExternalLink className="h-3 w-3 text-primary" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Sheet - Mobile Only - Rendered via Portal */}
      {mounted && isMobile && createPortal(
        <AnimatePresence>
          {show && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
              />

              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed inset-x-0 bottom-0 z-[101] bg-card border-t-2 border-primary rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
              >
                <div className="p-6 pb-8">
                  {/* Handle Bar */}
                  <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-6" />

                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/20 border-2 border-primary rounded-full flex-shrink-0">
                      <Github className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{t('openSourceTitle')}</h2>
                      <p className="text-xs text-muted-foreground">{t('openSourceSubtitle')}</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    {/* Features */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Code className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm mb-1">{t('openSourceCodeTitle')}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('openSourceCodeDesc')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Server className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm mb-1">{t('selfHostableTitle')}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('selfHostableDesc')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* GitHub Link */}
                    <a 
                      href="https://github.com/rstlgu/pastaa.git" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-4 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors border-2 border-primary/30"
                    >
                      <Github className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-sm">github.com/rstlgu/pastaa</span>
                      <ExternalLink className="h-4 w-4 text-primary" />
                    </a>

                    {/* Close Button */}
                    <Button
                      onClick={handleClose}
                      className="w-full border-2"
                      size="lg"
                    >
                      {t('ok')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

