"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock,
  AlertCircle,
  Copy,
  Check,
  Home,
} from "lucide-react";
import { importKey, decryptText } from "@/lib/crypto";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { BurnTextReveal } from "@/components/burn-text-reveal";
import { E2EBadge } from "@/components/e2e-badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PastaLogo } from "@/components/pasta-logo";
import { GitHubBadge } from "@/components/github-badge";

interface PasteData {
  encryptedContent: string;
  iv: string;
  passwordIv?: string;
  salt?: string;
  hasPassword: boolean;
  burnAfterReading: boolean;
}

export default function ViewPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pasteData, setPasteData] = useState<PasteData | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    loadAndDecrypt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAndDecrypt() {
    try {
      const id = params.id as string;
      const keyString = window.location.hash.slice(1);

      if (!keyString) {
        setError("Link non valido: chiave di decifratura mancante");
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/paste/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Paste non trovato");
        } else if (response.status === 410) {
          setError("Paste scaduto o già eliminato");
        } else {
          setError("Errore nel caricamento del paste");
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setBurnAfterReading(data.burnAfterReading);
      setPasteData(data);

      if (data.hasPassword) {
        setNeedsPassword(true);
        setIsLoading(false);
        return;
      }

      const key = await importKey(keyString);
      const text = await decryptText(data.encryptedContent, data.iv, key);
      setDecryptedText(text);
      setIsLoading(false);
    } catch (error) {
      console.error("Errore decifratura:", error);
      setError("Errore durante la decifratura del testo");
      setIsLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!pasteData || !password) {
        throw new Error("Dati mancanti");
      }

      const keyString = window.location.hash.slice(1);
      if (!keyString) {
        throw new Error("Chiave mancante");
      }

      if (!pasteData.salt || !pasteData.passwordIv) {
        setError("Dati di cifratura mancanti");
        setIsLoading(false);
        return;
      }

      const { deriveKeyFromPassword, decryptText: decrypt } = await import("@/lib/crypto");
      const passwordKey = await deriveKeyFromPassword(password, pasteData.salt);
      const firstDecryption = await decrypt(
        pasteData.encryptedContent,
        pasteData.passwordIv,
        passwordKey
      );

      const mainKey = await importKey(keyString);
      const finalText = await decrypt(
        firstDecryption,
        pasteData.iv,
        mainKey
      );

      setDecryptedText(finalText);
      setNeedsPassword(false);
      setIsLoading(false);
    } catch (error) {
      console.error("Errore decifratura:", error);
      setError("Password errata o errore di decifratura");
      setIsLoading(false);
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(decryptedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleFullyRevealed() {
    router.push("/");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-4"
          >
            <PastaLogo className="h-16 w-16 text-primary" />
          </motion.div>
          <p className="text-xl text-muted-foreground">
            Decifratura in corso...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="border-2 border-primary rounded-xl p-8 bg-card text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 border-2 border-red-500 rounded-full mb-6">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Errore</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/">
              <Button className="border-2 border-primary">
                <Home className="mr-2 h-4 w-4" />
                Torna alla Home
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="border-2 border-primary rounded-xl p-8 bg-card">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 border-2 border-primary rounded-full mb-4">
                <Lock className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Password Richiesta</h2>
              <p className="text-muted-foreground">
                Questo paste è protetto da password
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci la password"
                  required
                  className="mt-2 border-2"
                />
              </div>
              <Button type="submit" className="w-full border-2 border-primary">
                <Lock className="mr-2 h-4 w-4" />
                Sblocca
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <PastaLogo className="h-12 w-12 text-primary" />
            <h1 className="text-3xl font-bold font-righteous tracking-wider">Pastaa</h1>
          </Link>
          
          <div className="flex items-center gap-3">
            <E2EBadge />
            <GitHubBadge />
            <ThemeToggle />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {burnAfterReading ? (
            <BurnTextReveal
              text={decryptedText}
              onFullyRevealed={handleFullyRevealed}
            />
          ) : (
            <>
              <div className="relative border-2 border-primary rounded-xl bg-card overflow-hidden">
                <Textarea
                  value={decryptedText}
                  readOnly
                  className="min-h-[70vh] text-base font-mono border-0 focus-visible:ring-0 resize-none pb-24"
                />

                {/* Bottom Controls - Fixed at bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left - Copy Button */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Button onClick={copyToClipboard} className="border-2 border-primary">
                        {copied ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Copiato
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copia Testo
                          </>
                        )}
                      </Button>
                    </motion.div>

                    {/* Right - New Paste Button */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Link href="/">
                        <Button variant="outline" className="border-2">
                          <Home className="mr-2 h-4 w-4" />
                          Nuovo Paste
                        </Button>
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-3 text-center"
              >
                <p className="text-xs text-green-500 flex items-center justify-center gap-2">
                  <PastaLogo className="h-3 w-3" />
                  Testo decifrato localmente nel tuo browser
                </p>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </div>
    </TooltipProvider>
  );
}
