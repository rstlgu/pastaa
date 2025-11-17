"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

export function E2EBadge() {
  const { t } = useLanguage();
  const [showE2EInfo, setShowE2EInfo] = useState(false);
  const [showDesktopCard, setShowDesktopCard] = useState(false);

  return (
    <div className="relative">
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setShowE2EInfo(true)}
        onMouseEnter={() => setShowDesktopCard(true)}
        onMouseLeave={() => setShowDesktopCard(false)}
        className="inline-flex items-center justify-center rounded-full border-2 border-green-500 bg-green-500/20 hover:bg-green-500/30 h-10 w-10 transition-colors"
      >
        <Lock className="h-5 w-5 text-green-500" />
      </motion.button>

      {/* Desktop Hover Card */}
      <AnimatePresence>
        {showDesktopCard && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="hidden md:block absolute top-full right-0 mt-2 w-96 z-50"
            onMouseEnter={() => setShowDesktopCard(true)}
            onMouseLeave={() => setShowDesktopCard(false)}
          >
            <div className="bg-card border-2 border-green-500 rounded-xl shadow-2xl p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/20 border-2 border-green-500 rounded-full flex-shrink-0">
                  <Lock className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-500">{t('e2eEncryption')}</h3>
                  <p className="text-xs text-muted-foreground">{t('e2eFullName')}</p>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    {t('howItWorks')}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('e2eDescription')}
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-3 border">
                  <h5 className="font-semibold text-xs mb-2">{t('howItWorks')}:</h5>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold">
                        1
                      </div>
                      <div>
                        <p className="text-xs font-medium">{t('clientEncryption')}</p>
                        <p className="text-[10px] text-muted-foreground">{t('clientEncryptionDesc')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold">
                        2
                      </div>
                      <div>
                        <p className="text-xs font-medium">{t('keyInUrl')}</p>
                        <p className="text-[10px] text-muted-foreground">{t('keyInUrlDesc')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold">
                        3
                      </div>
                      <div>
                        <p className="text-xs font-medium">{t('localDecryption')}</p>
                        <p className="text-[10px] text-muted-foreground">{t('localDecryptionDesc')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* E2E Info Bottom Sheet - Mobile Only */}
      <AnimatePresence>
        {showE2EInfo && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowE2EInfo(false)}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="md:hidden fixed inset-x-0 bottom-0 z-[101] bg-card border-t-2 border-green-500 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="p-6 pb-8">
                {/* Handle Bar */}
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-6" />

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500/20 border-2 border-green-500 rounded-full flex-shrink-0">
                    <Lock className="h-7 w-7 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-green-500">{t('e2eEncryption')}</h2>
                    <p className="text-xs text-muted-foreground">{t('e2eFullName')}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      {t('howItWorks')}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t('e2eDescription')}
                    </p>
                  </div>

                  <div className="bg-muted rounded-lg p-4 border-2">
                    <h4 className="font-semibold text-sm mb-3">{t('howItWorks')}:</h4>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold">
                          1
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t('clientEncryption')}</p>
                          <p className="text-xs text-muted-foreground">{t('clientEncryptionDesc')}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold">
                          2
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t('keyInUrl')}</p>
                          <p className="text-xs text-muted-foreground">{t('keyInUrlDescLong')}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold">
                          3
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t('localDecryption')}</p>
                          <p className="text-xs text-muted-foreground">{t('localDecryptionDescLong')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setShowE2EInfo(false)} 
                    className="w-full"
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
    </div>
  );
}

