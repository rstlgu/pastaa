"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock, Copy, Check, Clock, Flame, Share2 } from "lucide-react";
import { generateKey, exportKey, encryptText } from "@/lib/crypto";
import { ThemeToggle } from "@/components/theme-toggle";
import { E2EBadge } from "@/components/e2e-badge";
import { PastaLogo } from "@/components/pasta-logo";
import { useLanguage } from "@/components/language-provider";
import { FeatureBadge } from "@/components/feature-badge";
import { GitHubBadge } from "@/components/github-badge";
import Link from "next/link";

export default function HomePage() {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [showExpiry, setShowExpiry] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>("1d");
  const [isLoading, setIsLoading] = useState(false);
  const [pasteId, setPasteId] = useState("");
  const [shortId, setShortId] = useState("");
  const [keyString, setKeyString] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Feature badges state
  const [showBurnBadge, setShowBurnBadge] = useState(false);
  const [showPasswordBadge, setShowPasswordBadge] = useState(false);
  const [showExpiryBadge, setShowExpiryBadge] = useState(false);

  // Check localStorage for first-time feature usage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenBurn = localStorage.getItem('pastaa_seen_burn');
      const hasSeenPassword = localStorage.getItem('pastaa_seen_password');
      const hasSeenExpiry = localStorage.getItem('pastaa_seen_expiry');
      
      if (!hasSeenBurn && burnAfterReading) {
        setShowBurnBadge(true);
        localStorage.setItem('pastaa_seen_burn', 'true');
        setTimeout(() => setShowBurnBadge(false), 5000);
      }
      
      if (!hasSeenPassword && usePassword) {
        setShowPasswordBadge(true);
        localStorage.setItem('pastaa_seen_password', 'true');
        setTimeout(() => setShowPasswordBadge(false), 5000);
      }
      
      if (!hasSeenExpiry && showExpiry) {
        setShowExpiryBadge(true);
        localStorage.setItem('pastaa_seen_expiry', 'true');
        setTimeout(() => setShowExpiryBadge(false), 5000);
      }
    }
  }, [burnAfterReading, usePassword, showExpiry]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const key = await generateKey();
      const keyString = await exportKey(key);

      const { encryptedContent: mainEncrypted, iv: mainIv } = await encryptText(text, key);
      
      let finalEncrypted = mainEncrypted;
      let passwordIv = null;
      let salt = null;

      if (usePassword && password) {
        const { generateSalt, deriveKeyFromPassword, encryptText: encrypt } = await import("@/lib/crypto");
        salt = generateSalt();
        const passwordKey = await deriveKeyFromPassword(password, salt);
        const secondEncryption = await encrypt(mainEncrypted, passwordKey);
        finalEncrypted = secondEncryption.encryptedContent;
        passwordIv = secondEncryption.iv;
      }

      const response = await fetch("/api/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encryptedContent: finalEncrypted,
          iv: mainIv,
          passwordIv,
          salt,
          hasPassword: usePassword,
          burnAfterReading,
          expiresIn: showExpiry ? expiresIn : "1d",
        }),
      });

      if (!response.ok) {
        throw new Error("Errore durante la creazione");
      }

      const { id, shortId } = await response.json();
      setPasteId(id);
      setShortId(shortId);
      setKeyString(keyString);
    } catch (error) {
      console.error("Errore:", error);
      alert(t('errorCreating'));
    } finally {
      setIsLoading(false);
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    const url = `${window.location.origin}/v/${shortId}#${keyString}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t('appName')} - ${t('e2eEncryption')}`,
          text: t('shareMessage'),
          url: url,
        });
      } catch {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      copyToClipboard(url);
    }
  }

  function reset() {
    setText("");
    setPassword("");
    setUsePassword(false);
    setBurnAfterReading(false);
    setShowExpiry(false);
    setExpiresIn("24h");
    setPasteId("");
    setShortId("");
    setKeyString("");
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <Link 
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <PastaLogo className="h-12 w-12 text-primary" />
            <h1 className="text-3xl font-bold font-righteous tracking-wider">Pastaa</h1>
          </Link>
          
          <div className="flex items-center gap-3">
            <E2EBadge />
            <GitHubBadge />
            <ThemeToggle />
          </div>
        </motion.div>

        {!pasteId ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <form onSubmit={handleSubmit}>
              {/* Main Textarea - Full Height */}
              <div className="relative border-2 border-primary rounded-xl bg-card overflow-hidden">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t('textPlaceholder')}
                  className="min-h-[70vh] text-base border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none pb-24"
                  required
                />

                {/* Floating Options - Above Bottom Controls */}
                <div className="absolute bottom-20 left-4 right-4 md:left-4 md:right-auto flex flex-col md:flex-row gap-3 items-stretch md:items-end">
                  <AnimatePresence>
                    {usePassword && (
                      <motion.div
                        key="password-input"
                        initial={{ y: 20, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="w-full md:w-64"
                      >
                        <Input
                          type="password"
                          placeholder={t('password')}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="border-2 border-primary backdrop-blur-sm bg-card/95 h-10"
                          required={usePassword}
                        />
                      </motion.div>
                    )}

                    {showExpiry && (
                      <motion.div
                        key="expiry-select"
                        initial={{ y: 20, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2, delay: 0.05 }}
                        className="w-full md:w-40"
                      >
                        <Select value={expiresIn} onValueChange={setExpiresIn}>
                          <SelectTrigger className="border-2 border-primary backdrop-blur-sm bg-card/95 h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1h">{t('oneHour')}</SelectItem>
                            <SelectItem value="4h">{t('fourHours')}</SelectItem>
                            <SelectItem value="1d">{t('oneDay')}</SelectItem>
                            <SelectItem value="7d">{t('sevenDays')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom Controls - Fixed at bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm p-4 z-10">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left - 3 Circle Buttons */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3"
                    >
                      {/* Burn After Reading */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            key={`burn-${burnAfterReading}`}
                            type="button"
                            variant={burnAfterReading ? "default" : "outline"}
                            size="icon"
                            onClick={() => {
                              setBurnAfterReading(!burnAfterReading);
                            }}
                            className="rounded-full border-2 active:scale-95 transition-transform"
                          >
                            <Flame className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="hidden md:block">{t('burnTooltip')}</TooltipContent>
                      </Tooltip>

                      {/* Password */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            key={`password-${usePassword}`}
                            type="button"
                            variant={usePassword ? "default" : "outline"}
                            size="icon"
                            onClick={() => {
                              setUsePassword(!usePassword);
                            }}
                            className="rounded-full border-2 active:scale-95 transition-transform"
                          >
                            <Lock className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="hidden md:block">{t('passwordTooltip')}</TooltipContent>
                      </Tooltip>

                      {/* Expiry */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            key={`expiry-${showExpiry}`}
                            type="button"
                            variant={showExpiry ? "default" : "outline"}
                            size="icon"
                            onClick={() => {
                              setShowExpiry(!showExpiry);
                            }}
                            className="rounded-full border-2 active:scale-95 transition-transform"
                          >
                            <Clock className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="hidden md:block">{t('expirationTooltip')}</TooltipContent>
                      </Tooltip>
                    </motion.div>

                    {/* Right - Submit Button */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Button
                        type="submit"
                        className="border-2 border-primary"
                        disabled={isLoading || !text}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <PastaLogo className="h-4 w-4 animate-spin" />
                            {t('encrypting')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('encryptAndShare')}
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Info Text - Outside Form */}
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {t('maxSize')} • {t('encryption')}
              </p>
            </form>
          </motion.div>
        ) : (
          <>
            {/* Desktop Version - Center */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden md:block border-2 border-primary rounded-xl bg-card overflow-hidden"
            >
              {/* Success Section */}
              <div className="p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 border-2 border-primary rounded-full flex-shrink-0"
                  >
                    <Check className="h-8 w-8 text-primary" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold">{t('linkGenerated')}</h2>
                    <p className="text-sm text-muted-foreground">{t('shareLink')}</p>
                  </div>
                </div>

                {/* Link Display */}
                <div className="space-y-3">
                  <span className="text-sm text-muted-foreground block">{t('shareLink')}</span>
                  <div className="flex items-start gap-2 bg-muted rounded-lg p-4 border-2">
                    <p className="flex-1 font-mono text-sm break-all leading-relaxed">
                      {window.location.origin}/v/{shortId}#{keyString}
                    </p>
                    <Button
                      onClick={() => copyToClipboard(`${window.location.origin}/v/${shortId}#${keyString}`)}
                      size="icon"
                      variant="ghost"
                      className="flex-shrink-0 hover:bg-primary/10 h-10 w-10"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-primary" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Mobile Version - Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-card border-t-2 border-primary rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
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
                    <Check className="h-7 w-7 text-primary" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold">{t('linkGenerated')}</h2>
                    <p className="text-xs text-muted-foreground">{t('shareLink')}</p>
                  </div>
                </div>

                {/* Link Display */}
                <div className="space-y-4">
                  <div className="flex items-start gap-2 bg-muted rounded-lg p-4 border-2">
                    <p className="flex-1 font-mono text-xs break-all leading-relaxed">
                      {window.location.origin}/v/{shortId}#{keyString}
                    </p>
                    <Button
                      onClick={() => copyToClipboard(`${window.location.origin}/v/${shortId}#${keyString}`)}
                      size="icon"
                      variant="ghost"
                      className="flex-shrink-0 hover:bg-primary/10 h-10 w-10"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-primary" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button
                      onClick={shareLink}
                      className="w-full border-2 border-primary"
                      size="lg"
                    >
                      <Share2 className="mr-2 h-5 w-5" />
                      {t('shareLink')}
                    </Button>
                    
                    <Button onClick={reset} variant="outline" className="w-full border-2" size="lg">
                      {t('newPaste')}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Desktop Actions Outside Box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden md:block mt-4"
            >
              <Button onClick={reset} variant="outline" className="w-full border-2" size="lg">
                {t('newPaste')}
              </Button>
            </motion.div>
          </>
        )}
        </div>
      </div>
      
      {/* Feature Info Badges */}
      <FeatureBadge feature="burn" show={showBurnBadge} onClose={() => setShowBurnBadge(false)} />
      <FeatureBadge feature="password" show={showPasswordBadge} onClose={() => setShowPasswordBadge(false)} />
      <FeatureBadge feature="expiry" show={showExpiryBadge} onClose={() => setShowExpiryBadge(false)} />
    </TooltipProvider>
  );
}

