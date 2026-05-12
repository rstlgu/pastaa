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
  Download,
  FileText,
} from "lucide-react";
import { importKey, decryptText, decryptBytes } from "@/lib/crypto";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { BurnTextReveal } from "@/components/burn-text-reveal";
import { E2EBadge } from "@/components/e2e-badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PastaLogo } from "@/components/pasta-logo";
import { GitHubBadge } from "@/components/github-badge";
import { useLanguage } from "@/components/language-provider";

interface PasteData {
  encryptedContent: string;
  iv: string;
  passwordIv?: string | null;
  salt?: string | null;
  hasPassword: boolean;
  burnAfterReading: boolean;
  encryptedFiles?: EncryptedFilePayload[] | null;
  encryptedFileContent?: string | null;
  fileIv?: string | null;
  encryptedFileMetadata?: string | null;
  fileMetadataIv?: string | null;
  passwordFileIv?: string | null;
  passwordFileMetadataIv?: string | null;
}

interface EncryptedFilePayload {
  encryptedContent: string;
  iv: string;
  encryptedMetadata: string;
  metadataIv: string;
  passwordIv?: string | null;
  passwordMetadataIv?: string | null;
  size: number;
}

interface FileMetadata {
  name: string;
  type: string;
  size: number;
}

interface DecryptedFile extends FileMetadata {
  url: string;
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getEncryptedFiles(data: PasteData): EncryptedFilePayload[] {
  if (data.encryptedFiles?.length) return data.encryptedFiles;

  if (
    data.encryptedFileContent &&
    data.fileIv &&
    data.encryptedFileMetadata &&
    data.fileMetadataIv
  ) {
    return [
      {
        encryptedContent: data.encryptedFileContent,
        iv: data.fileIv,
        encryptedMetadata: data.encryptedFileMetadata,
        metadataIv: data.fileMetadataIv,
        passwordIv: data.passwordFileIv,
        passwordMetadataIv: data.passwordFileMetadataIv,
        size: 0,
      },
    ];
  }

  return [];
}

export default function ViewPage() {
  const { t } = useLanguage();
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
  const [decryptedFiles, setDecryptedFiles] = useState<DecryptedFile[]>([]);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    loadAndDecrypt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      decryptedFiles.forEach((file) => URL.revokeObjectURL(file.url));
    };
  }, [decryptedFiles]);

  async function decryptPasteData(
    data: PasteData,
    keyString: string,
    passwordKey?: CryptoKey
  ) {
    let encryptedText = data.encryptedContent;
    let encryptedFiles = getEncryptedFiles(data);

    if (passwordKey) {
      if (!data.passwordIv) throw new Error("IV password mancante");

      encryptedText = await decryptText(data.encryptedContent, data.passwordIv, passwordKey);

      encryptedFiles = await Promise.all(
        encryptedFiles.map(async (file) => {
          if (!file.passwordIv || !file.passwordMetadataIv) {
            throw new Error("Dati file protetti da password mancanti");
          }

          const [encryptedContent, encryptedMetadata] = await Promise.all([
            decryptText(file.encryptedContent, file.passwordIv, passwordKey),
            decryptText(file.encryptedMetadata, file.passwordMetadataIv, passwordKey),
          ]);

          return {
            ...file,
            encryptedContent,
            encryptedMetadata,
          };
        })
      );
    }

    const key = await importKey(keyString);
    const text = await decryptText(encryptedText, data.iv, key);
    setDecryptedText(text);

    if (encryptedFiles.length === 0) {
      setDecryptedFiles([]);
      return;
    }

    const files = await Promise.all(
      encryptedFiles.map(async (file) => {
        const [fileBuffer, metadataText] = await Promise.all([
          decryptBytes(file.encryptedContent, file.iv, key),
          decryptText(file.encryptedMetadata, file.metadataIv, key),
        ]);
        const metadata = JSON.parse(metadataText) as FileMetadata;
        const blob = new Blob([new Uint8Array(fileBuffer)], {
          type: metadata.type || "application/octet-stream",
        });

        return {
          name: metadata.name,
          type: metadata.type || "application/octet-stream",
          size: metadata.size,
          url: URL.createObjectURL(blob),
        };
      })
    );

    setDecryptedFiles(files);
  }

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

      await decryptPasteData(data, keyString);
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

      const { deriveKeyFromPassword } = await import("@/lib/crypto");
      const passwordKey = await deriveKeyFromPassword(password, pasteData.salt);
      await decryptPasteData(pasteData, keyString, passwordKey);
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

  function renderDecryptedFiles() {
    if (decryptedFiles.length === 0) return null;

    return (
      <div className="mt-4 rounded-xl border-2 border-primary bg-card p-4">
        <div className="flex flex-col gap-3">
          {decryptedFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • {t('fileWillBeEncrypted')}
                  </p>
                </div>
              </div>
              <Button asChild className="border-2 border-primary">
                <a href={file.url} download={file.name}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('downloadFile')}
                </a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
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
          {burnAfterReading && decryptedText ? (
            <>
              <BurnTextReveal
                text={decryptedText}
                onFullyRevealed={handleFullyRevealed}
              />
              {renderDecryptedFiles()}
            </>
          ) : (
            <>
              {decryptedText ? (
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
              ) : (
                <div className="rounded-xl border-2 border-primary bg-card p-8 text-center">
                  <FileText className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <h2 className="text-xl font-bold">{t('encryptedAttachment')}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nessun testo incluso, solo allegato decifrato localmente.
                  </p>
                </div>
              )}

              {renderDecryptedFiles()}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-3 text-center"
              >
                <p className="text-xs text-green-500 flex items-center justify-center gap-2">
                  <PastaLogo className="h-3 w-3" />
                  {decryptedFiles.length > 0
                    ? "Contenuto e allegato decifrati localmente nel tuo browser"
                    : "Testo decifrato localmente nel tuo browser"}
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
