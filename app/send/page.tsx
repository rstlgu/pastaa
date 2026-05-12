"use client";

import { useState, useEffect, useRef } from "react";
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
import { Lock, Copy, Check, Clock, Flame, Share2, Paperclip, X, Mail } from "lucide-react";
import { generateKey, exportKey, encryptText, encryptBytes } from "@/lib/crypto";
import { ThemeToggle } from "@/components/theme-toggle";
import { E2EBadge } from "@/components/e2e-badge";
import { PastaLogo } from "@/components/pasta-logo";
import { useLanguage } from "@/components/language-provider";
import { FeatureBadge } from "@/components/feature-badge";
import { GitHubBadge } from "@/components/github-badge";
import Link from "next/link";
import { toast } from "sonner";

const MAX_TEXT_SIZE = 100 * 1024;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILE_COUNT = 10;
const DEFAULT_EXPIRES_IN = "7d";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const VERIFIED_EMAIL_STORAGE_KEY = "pastaa_verified_sender_email";

interface EncryptedFilePayload {
  encryptedContent: string;
  iv: string;
  encryptedMetadata: string;
  metadataIv: string;
  passwordIv?: string | null;
  passwordMetadataIv?: string | null;
  size: number;
}

interface TurnstileInstance {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      theme?: "light" | "dark" | "auto";
    }
  ) => string;
  reset: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileInstance;
  }
}

interface TurnstileChallengeProps {
  onTokenChange: (token: string) => void;
}

interface VerifiedSenderEmail {
  email: string;
  token: string;
}

function TurnstileChallenge({ onTokenChange }: TurnstileChallengeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>();

  useEffect(() => {
    const siteKey = TURNSTILE_SITE_KEY ?? "";
    if (!siteKey || !containerRef.current) return;

    let isCancelled = false;

    function renderWidget() {
      if (isCancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: onTokenChange,
        "expired-callback": () => onTokenChange(""),
        "error-callback": () => onTokenChange(""),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const scriptId = "cf-turnstile-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      } else {
        const interval = window.setInterval(() => {
          if (window.turnstile) {
            window.clearInterval(interval);
            renderWidget();
          }
        }, 100);

        return () => {
          isCancelled = true;
          window.clearInterval(interval);
        };
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [onTokenChange]);

  if (!TURNSTILE_SITE_KEY) {
    return (
      <p className="text-xs text-destructive">
        CAPTCHA non configurato: imposta NEXT_PUBLIC_TURNSTILE_SITE_KEY.
      </p>
    );
  }

  return <div ref={containerRef} className="min-h-[65px]" />;
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getTotalFileSize(files: File[]): number {
  return files.reduce((total, file) => total + file.size, 0);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export default function HomePage() {
  const { t, language } = useLanguage();
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [showExpiry, setShowExpiry] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>(DEFAULT_EXPIRES_IN);
  const [isLoading, setIsLoading] = useState(false);
  const [pasteId, setPasteId] = useState("");
  const [shortId, setShortId] = useState("");
  const [keyString, setKeyString] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderVerificationToken, setSenderVerificationToken] = useState("");
  const [senderEmailVerified, setSenderEmailVerified] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [emailChallengeToken, setEmailChallengeToken] = useState("");
  const [isSendingVerificationCode, setIsSendingVerificationCode] = useState(false);
  const [isVerifyingSenderEmail, setIsVerifyingSenderEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Feature badges state
  const [showBurnBadge, setShowBurnBadge] = useState(false);
  const [showPasswordBadge, setShowPasswordBadge] = useState(false);
  const [showExpiryBadge, setShowExpiryBadge] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem(VERIFIED_EMAIL_STORAGE_KEY);
    if (!saved) return;

    try {
      const verifiedEmail = JSON.parse(saved) as VerifiedSenderEmail;
      if (verifiedEmail.email && verifiedEmail.token) {
        setSenderEmail(verifiedEmail.email);
        setSenderVerificationToken(verifiedEmail.token);
        setSenderEmailVerified(true);
      }
    } catch {
      localStorage.removeItem(VERIFIED_EMAIL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const normalizedSenderEmail = normalizeEmail(senderEmail);
    if (!normalizedSenderEmail) {
      setSenderEmailVerified(false);
      setSenderVerificationToken("");
      return;
    }

    const saved = localStorage.getItem(VERIFIED_EMAIL_STORAGE_KEY);
    if (!saved) {
      setSenderEmailVerified(false);
      setSenderVerificationToken("");
      return;
    }

    try {
      const verifiedEmail = JSON.parse(saved) as VerifiedSenderEmail;
      const isSameEmail = normalizeEmail(verifiedEmail.email) === normalizedSenderEmail;
      setSenderEmailVerified(isSameEmail && Boolean(verifiedEmail.token));
      setSenderVerificationToken(isSameEmail ? verifiedEmail.token : "");
    } catch {
      setSenderEmailVerified(false);
      setSenderVerificationToken("");
    }
  }, [senderEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const normalizedPassword = password.trim();
    const totalFileSize = getTotalFileSize(selectedFiles);

    if (!text.trim() && selectedFiles.length === 0) {
      alert(t('contentRequired'));
      return;
    }

    if (new TextEncoder().encode(text).byteLength > MAX_TEXT_SIZE) {
      alert(t('textTooLarge'));
      return;
    }

    if (usePassword && !normalizedPassword) {
      alert(t('passwordEmptyError'));
      return;
    }

    if (selectedFiles.length > MAX_FILE_COUNT || totalFileSize > MAX_FILE_SIZE) {
      alert(t('fileTooLarge'));
      return;
    }

    setIsLoading(true);

    try {
      const key = await generateKey();
      const keyString = await exportKey(key);

      const { encryptedContent: mainEncrypted, iv: mainIv } = await encryptText(text, key);

      let finalEncrypted = mainEncrypted;
      let passwordIv = null;
      let salt = null;
      let encryptedFiles: EncryptedFilePayload[] = [];

      for (const file of selectedFiles) {
        const fileBuffer = await file.arrayBuffer();
        const fileEncryption = await encryptBytes(fileBuffer, key);
        const metadataEncryption = await encryptText(
          JSON.stringify({
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
          }),
          key
        );

        encryptedFiles.push({
          encryptedContent: fileEncryption.encryptedContent,
          iv: fileEncryption.iv,
          encryptedMetadata: metadataEncryption.encryptedContent,
          metadataIv: metadataEncryption.iv,
          size: file.size,
        });
      }

      if (usePassword && normalizedPassword) {
        const { generateSalt, deriveKeyFromPassword, encryptText: encrypt } = await import("@/lib/crypto");
        salt = generateSalt();
        const passwordKey = await deriveKeyFromPassword(normalizedPassword, salt);
        const secondEncryption = await encrypt(mainEncrypted, passwordKey);
        finalEncrypted = secondEncryption.encryptedContent;
        passwordIv = secondEncryption.iv;

        encryptedFiles = await Promise.all(
          encryptedFiles.map(async (file) => {
            const filePasswordEncryption = await encrypt(file.encryptedContent, passwordKey);
            const metadataPasswordEncryption = await encrypt(file.encryptedMetadata, passwordKey);

            return {
              ...file,
              encryptedContent: filePasswordEncryption.encryptedContent,
              encryptedMetadata: metadataPasswordEncryption.encryptedContent,
              passwordIv: filePasswordEncryption.iv,
              passwordMetadataIv: metadataPasswordEncryption.iv,
            };
          })
        );
      }

      const response = await fetch("/api/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encryptedContent: finalEncrypted,
          iv: mainIv,
          passwordIv,
          salt,
          hasPassword: usePassword && Boolean(normalizedPassword),
          burnAfterReading,
          expiresIn: showExpiry ? expiresIn : DEFAULT_EXPIRES_IN,
          encryptedFiles,
          fileSize: totalFileSize,
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

  function getShareUrl(): string {
    return `${window.location.origin}/v/${shortId}#${keyString}`;
  }

  async function requestSenderEmailVerification() {
    const email = normalizeEmail(senderEmail);
    if (!email) return;
    if (!captchaToken) {
      toast.error(t("captchaRequired"));
      return;
    }

    setIsSendingVerificationCode(true);
    try {
      const response = await fetch("/api/share-paste-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          email,
          captchaToken,
          locale: language,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        challengeToken?: string;
        error?: string;
      };

      if (!response.ok || !data.challengeToken) {
        toast.error(typeof data.error === "string" ? data.error : t("emailVerificationSendFailed"));
        return;
      }

      setEmailChallengeToken(data.challengeToken);
      setEmailVerificationCode("");
      setSenderEmailVerified(false);
      setSenderVerificationToken("");
      toast.success(t("emailVerificationSent"));
    } catch {
      toast.error(t("emailVerificationSendFailed"));
    } finally {
      setIsSendingVerificationCode(false);
      setCaptchaToken("");
      window.turnstile?.reset();
    }
  }

  async function confirmSenderEmailVerification() {
    const email = normalizeEmail(senderEmail);
    const code = emailVerificationCode.trim();
    if (!email || !code || !emailChallengeToken) return;

    setIsVerifyingSenderEmail(true);
    try {
      const response = await fetch("/api/share-paste-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          email,
          code,
          challengeToken: emailChallengeToken,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        email?: string;
        verificationToken?: string;
        error?: string;
      };

      if (!response.ok || !data.email || !data.verificationToken) {
        toast.error(typeof data.error === "string" ? data.error : t("emailVerificationFailed"));
        return;
      }

      const verifiedEmail: VerifiedSenderEmail = {
        email: data.email,
        token: data.verificationToken,
      };
      localStorage.setItem(VERIFIED_EMAIL_STORAGE_KEY, JSON.stringify(verifiedEmail));
      setSenderEmail(data.email);
      setSenderVerificationToken(data.verificationToken);
      setSenderEmailVerified(true);
      setEmailChallengeToken("");
      setEmailVerificationCode("");
      toast.success(t("emailVerified"));
    } catch {
      toast.error(t("emailVerificationFailed"));
    } finally {
      setIsVerifyingSenderEmail(false);
    }
  }

  async function shareLink() {
    const url = getShareUrl();
    
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

  async function sendPasteEmail() {
    const to = recipientEmail.trim();
    if (!to || !shortId) return;
    if (!senderEmailVerified || !senderVerificationToken) {
      toast.error(t("senderEmailNotVerified"));
      return;
    }
    if (!captchaToken) {
      toast.error(t("captchaRequired"));
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch("/api/share-paste-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          fromEmail: normalizeEmail(senderEmail),
          senderVerificationToken,
          shareUrl: getShareUrl(),
          shortId,
          message: emailMessage.trim(),
          subject: t("emailSubject"),
          locale: language,
          captchaToken,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        if (response.status === 503) {
          toast.error(t("emailNotConfigured"));
        } else {
          toast.error(typeof data.error === "string" ? data.error : t("emailSendFailed"));
        }
        return;
      }

      toast.success(t("emailSent"));
      setCaptchaToken("");
    } catch {
      toast.error(t("emailSendFailed"));
    } finally {
      setIsSendingEmail(false);
      setCaptchaToken("");
      window.turnstile?.reset();
    }
  }

  function reset() {
    setText("");
    setPassword("");
    setSelectedFiles([]);
    setFileError("");
    setUsePassword(false);
    setBurnAfterReading(false);
    setShowExpiry(false);
    setExpiresIn(DEFAULT_EXPIRES_IN);
    setPasteId("");
    setShortId("");
    setKeyString("");
    setRecipientEmail("");
    setEmailMessage("");
    setIsSendingEmail(false);
    setCaptchaToken("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);

    if (files.length === 0) {
      setFileError("");
      return;
    }

    const nextFiles = [...selectedFiles, ...files].slice(0, MAX_FILE_COUNT + 1);
    const totalFileSize = getTotalFileSize(nextFiles);

    if (nextFiles.length > MAX_FILE_COUNT || totalFileSize > MAX_FILE_SIZE) {
      setFileError(t('fileTooLarge'));
      e.target.value = "";
      return;
    }

    setSelectedFiles(nextFiles);
    setFileError("");
    e.target.value = "";
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index));
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function renderEmailShareForm() {
    return (
      <div className="rounded-lg border-2 bg-muted/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">{t('sendByEmail')}</p>
            <p className="text-xs text-muted-foreground">{t('emailShareDescription')}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="space-y-2">
            <Input
              type="email"
              value={senderEmail}
              onChange={(e) => {
                setSenderEmail(e.target.value);
                setEmailChallengeToken("");
                setEmailVerificationCode("");
              }}
              placeholder={t('senderEmail')}
              className="border-2"
            />
            {senderEmailVerified ? (
              <p className="text-xs text-primary">{t('senderEmailVerified')}</p>
            ) : (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestSenderEmailVerification}
                  disabled={!senderEmail.trim() || !captchaToken || isSendingVerificationCode}
                  className="w-full border-2"
                >
                  {isSendingVerificationCode ? t("emailSending") : t("confirmSenderEmail")}
                </Button>
                {emailChallengeToken ? (
                  <div className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      value={emailVerificationCode}
                      onChange={(e) => setEmailVerificationCode(e.target.value.replace(/\D/g, ""))}
                      placeholder={t('emailVerificationCode')}
                      className="border-2"
                    />
                    <Button
                      type="button"
                      onClick={confirmSenderEmailVerification}
                      disabled={emailVerificationCode.trim().length !== 6 || isVerifyingSenderEmail}
                      className="border-2 border-primary"
                    >
                      {isVerifyingSenderEmail ? t("loading") : t("verifyEmail")}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <Input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder={t('recipientEmail')}
            className="border-2"
          />
          <Textarea
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            placeholder={t('emailMessagePlaceholder')}
            className="min-h-20 resize-none border-2"
          />
          <TurnstileChallenge onTokenChange={setCaptchaToken} />
          <Button
            type="button"
            onClick={sendPasteEmail}
            disabled={!senderEmailVerified || !recipientEmail.trim() || !captchaToken || isSendingEmail}
            className="w-full border-2 border-primary"
          >
            <Mail className="mr-2 h-4 w-4" />
            {isSendingEmail ? t("emailSending") : t("sendEmail")}
          </Button>
        </div>
      </div>
    );
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
            <E2EBadge showHowItWorks={false} />
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
                  className="min-h-[70vh] text-base border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none pb-40"
                />

                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                <AnimatePresence>
                  {selectedFiles.length > 0 && (
                    <motion.div
                      key="selected-files"
                      initial={{ y: 20, opacity: 0, scale: 0.95 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 20, opacity: 0, scale: 0.95 }}
                      className="absolute bottom-32 left-4 right-4 md:left-auto md:w-96 rounded-lg border-2 border-primary bg-card/95 p-3 backdrop-blur-sm"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-5 w-5 text-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {selectedFiles.length}/10 {t('attachedFiles')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(getTotalFileSize(selectedFiles))} / 10 MB • {t('fileWillBeEncrypted')}
                            </p>
                          </div>
                        </div>
                        <div className="max-h-32 overflow-y-auto pr-1">
                          {selectedFiles.map((file, index) => (
                            <div key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-2 py-1">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">{file.name}</p>
                                <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSelectedFile(index)}
                                className="h-7 w-7"
                                aria-label={t('removeFile')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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

                      {/* File Upload */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={selectedFiles.length > 0 ? "default" : "outline"}
                            size="icon"
                            asChild
                            className="rounded-full border-2 active:scale-95 transition-transform"
                          >
                            <label htmlFor="file-upload" className="cursor-pointer">
                              <Paperclip className="h-5 w-5" />
                            </label>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="hidden md:block">{t('attachFile')}</TooltipContent>
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
                        disabled={isLoading || (!text.trim() && selectedFiles.length === 0)}
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
                {t('maxSize')} • {t('maxFileSize')} • {t('encryption')}
              </p>
              {fileError && (
                <p className="mt-2 text-center text-xs text-destructive">{fileError}</p>
              )}
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
                  {renderEmailShareForm()}
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
                  {renderEmailShareForm()}

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

