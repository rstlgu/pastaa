"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Github, ExternalLink, Code, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

interface GitHubBadgeProps {
  show: boolean;
  onClose: () => void;
}

export function GitHubBadge({ show, onClose }: GitHubBadgeProps) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-card border-t-2 border-primary rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6 pb-8">
              {/* Handle Bar */}
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-6" />

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="inline-flex items-center justify-center w-14 h-14 bg-primary/20 border-2 border-primary rounded-full flex-shrink-0"
                >
                  <Github className="h-7 w-7 text-primary" />
                </motion.div>
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
                  onClick={onClose}
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
    </AnimatePresence>
  );
}

