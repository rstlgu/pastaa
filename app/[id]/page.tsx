"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Github, Home, Save, Check, Loader2, Code, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { E2EBadge } from "@/components/e2e-badge";
import { GitHubBadge } from "@/components/github-badge";
import { PastaLogo } from "@/components/pasta-logo";
import { useLanguage } from "@/components/language-provider";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from '@/components/editor-toolbar';
import { useTheme } from '@/components/theme-provider';
import { toast } from 'sonner';
import './editor.css';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { php } from '@codemirror/lang-php';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { java } from '@codemirror/lang-java';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false });

// Funzione helper per ottenere l'estensione del linguaggio
function getLanguageExtension(language: string) {
  switch (language) {
    case 'javascript':
      return javascript({ jsx: true, typescript: false });
    case 'typescript':
      return javascript({ jsx: false, typescript: true });
    case 'jsx':
      return javascript({ jsx: true, typescript: false });
    case 'tsx':
      return javascript({ jsx: true, typescript: true });
    case 'python':
      return python();
    case 'html':
      return html();
    case 'css':
      return css();
    case 'json':
      return json();
    case 'markdown':
      return markdown();
    case 'php':
      return php();
    case 'sql':
      return sql();
    case 'xml':
      return xml();
    case 'java':
      return java();
    default:
      return javascript();
  }
}

// Funzione per rilevare automaticamente il linguaggio dal contenuto
function detectLanguage(content: string): string {
  if (!content || content.trim().length === 0) return 'auto';
  
  const trimmed = content.trim();
  
  // HTML
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || /<[a-z]+.*>.*<\/[a-z]+>/i.test(trimmed)) {
    return 'html';
  }
  
  // JSON
  try {
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      JSON.parse(trimmed);
      return 'json';
    }
  } catch {}
  
  // Python
  if (/^(def|class|import|from|print|if __name__|elif)\s/m.test(content)) {
    return 'python';
  }
  
  // PHP
  if (trimmed.startsWith('<?php') || /\$[a-zA-Z_]/.test(content)) {
    return 'php';
  }
  
  // SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/im.test(content)) {
    return 'sql';
  }
  
  // CSS
  if (/[.#][a-zA-Z-_]+\s*\{[\s\S]*\}/m.test(content) || /@media|@keyframes/.test(content)) {
    return 'css';
  }
  
  // Markdown
  if (/^#{1,6}\s|\*\*|__|\[.*\]\(.*\)|^-\s|^\*\s|^>\s/m.test(content)) {
    return 'markdown';
  }
  
  // TypeScript/TSX (controlla prima di JavaScript)
  if (/:\s*(string|number|boolean|void|any)\s*[=;{]|interface\s+\w+|type\s+\w+\s*=/.test(content)) {
    if (/<[A-Z][a-zA-Z]*/.test(content)) {
      return 'tsx';
    }
    return 'typescript';
  }
  
  // JSX/JavaScript
  if (/^(import|export|const|let|var|function|class)\s|=>|\${|`/m.test(content)) {
    if (/<[A-Z][a-zA-Z]*/.test(content) || /React|Component|useState|useEffect/.test(content)) {
      return 'jsx';
    }
    return 'javascript';
  }
  
  // Java
  if (/^(public|private|protected|class|package|import java)\s/m.test(content)) {
    return 'java';
  }
  
  // XML
  if (trimmed.startsWith('<?xml') || /<\?xml|<[a-z]+:[a-z]+/i.test(trimmed)) {
    return 'xml';
  }
  
  return 'auto';
}

export default function PublicPageEditor() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;
  
  const [contentDocs, setContentDocs] = useState("");
  const [contentCode, setContentCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showGitHubBadge, setShowGitHubBadge] = useState(false);
  const [pageExists, setPageExists] = useState(false);
  const [editorMode, setEditorMode] = useState<'code' | 'docs'>('code');
  const [codeLanguage, setCodeLanguage] = useState<string>('auto');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('auto');
  const [showModeChangeDialog, setShowModeChangeDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<'code' | 'docs' | null>(null);
  const lastSavedContentRef = useRef<string>("");

  // Carica il contenuto della pagina
  useEffect(() => {
    async function loadPage() {
      try {
        const response = await fetch(`/api/public-page?id=${encodeURIComponent(pageId)}`);
        const data = await response.json();
        
        if (data.content) {
          // Prova a parsare come JSON per vedere se ha contenuti separati
          try {
            const parsed = JSON.parse(data.content);
            if (parsed.docs !== undefined && parsed.code !== undefined) {
              setContentDocs(parsed.docs || '<p></p>');
              setContentCode(parsed.code || '');
              lastSavedContentRef.current = data.content;
            } else {
              // Vecchio formato - usa come code
              setContentCode(data.content);
              lastSavedContentRef.current = data.content;
            }
          } catch {
            // Non è JSON, è testo semplice - usa come code
            setContentCode(data.content);
            lastSavedContentRef.current = data.content;
          }
          setPageExists(data.exists);
          if (data.updatedAt) {
            setLastSaved(new Date(data.updatedAt));
          }
        }
      } catch (error) {
        console.error('Errore caricamento pagina:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();
  }, [pageId, t]);

  // Funzione di salvataggio
  const handleSave = useCallback(async () => {
    // Crea oggetto con entrambi i contenuti
    const contentToSave = JSON.stringify({
      docs: contentDocs,
      code: contentCode,
    });
    
    // Salva solo se il contenuto è cambiato
    if (contentToSave === lastSavedContentRef.current) return;
    if (!contentDocs.trim() && !contentCode.trim()) return;
    
    setIsSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/public-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pageId, content: contentToSave }),
      });

      if (response.ok) {
        const data = await response.json();
        lastSavedContentRef.current = contentToSave;
        setLastSaved(new Date(data.updatedAt));
        setSaved(true);
        setPageExists(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
    } finally {
      setIsSaving(false);
    }
  }, [contentDocs, contentCode, pageId]);

  // Auto-save ogni 3 secondi dopo modifiche
  useEffect(() => {
    const contentToSave = JSON.stringify({ docs: contentDocs, code: contentCode });
    if (isSaving || contentToSave === lastSavedContentRef.current) return;
    if (!contentDocs.trim() && !contentCode.trim()) return;
    
    const timer = setTimeout(() => {
      handleSave();
    }, 3000);

    return () => clearTimeout(timer);
  }, [contentDocs, contentCode, isSaving, handleSave]);

  // TipTap editor per modalità docs
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: `Scrivi qui il tuo contenuto per /${pageId}...`,
      }),
    ],
    content: contentDocs || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContentDocs(html);
    },
  });

  // Sincronizza editor quando cambia contentDocs dall'esterno
  useEffect(() => {
    if (editor && !isLoading && contentDocs !== editor.getHTML()) {
      editor.commands.setContent(contentDocs || '<p></p>');
    }
  }, [editor, isLoading]);

  // Funzione per verificare se c'è contenuto nell'editor
  const hasContent = (mode: 'code' | 'docs') => {
    if (mode === 'code') {
      return contentCode.trim().length > 0;
    } else {
      // Per TipTap, considera vuoto se è solo <p></p> o simile
      const stripped = contentDocs.replace(/<p><\/p>/g, '').replace(/<p>\s*<\/p>/g, '').trim();
      return stripped.length > 0;
    }
  };

  // Gestione cambio modalità con conferma
  const handleModeChange = (newMode: 'code' | 'docs') => {
    if (newMode === editorMode) return;
    
    // Controlla se l'altra modalità ha contenuto
    const otherMode = newMode === 'code' ? 'docs' : 'code';
    if (hasContent(otherMode)) {
      setPendingMode(newMode);
      setShowModeChangeDialog(true);
    } else {
      setEditorMode(newMode);
    }
  };

  // Conferma cambio modalità e cancella contenuto della modalità corrente
  const confirmModeChange = () => {
    if (pendingMode) {
      // Cancella il contenuto della modalità corrente
      if (editorMode === 'code') {
        setContentCode('');
      } else {
        setContentDocs('<p></p>');
        if (editor) {
          editor.commands.setContent('<p></p>');
        }
      }
      setEditorMode(pendingMode);
      setPendingMode(null);
    }
    setShowModeChangeDialog(false);
  };

  // Annulla cambio modalità
  const cancelModeChange = () => {
    setPendingMode(null);
    setShowModeChangeDialog(false);
  };

  // Copia l'URL completo nella clipboard
  const copyPageId = async () => {
    try {
      const fullUrl = `${window.location.origin}/${pageId}`;
      await navigator.clipboard.writeText(fullUrl);
      toast(t('linkCopied'), {
        duration: 2000,
        position: 'bottom-right',
      });
    } catch (error) {
      console.error('Errore copia:', error);
    }
  };

  // Rileva automaticamente il linguaggio quando il contenuto cambia
  useEffect(() => {
    if (editorMode === 'code' && codeLanguage === 'auto' && contentCode) {
      const detected = detectLanguage(contentCode);
      setDetectedLanguage(detected);
      // Se viene rilevato un linguaggio specifico, aggiorna la select
      if (detected !== 'auto') {
        setCodeLanguage(detected);
      }
    }
  }, [contentCode, codeLanguage, editorMode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <PastaLogo className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Navbar */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b-2 border-primary bg-card/50 backdrop-blur-sm sticky top-0 z-50"
        >
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            {/* Left - Logo + Page ID */}
            <div className="flex items-center gap-4">
              <Link href="/send" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <PastaLogo className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                <span className="font-bold font-righteous text-lg md:text-xl">Pastaa</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <button
                  onClick={copyPageId}
                  className="px-3 py-1 bg-muted rounded-lg text-sm font-mono border-2 border-primary/30 hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  /{pageId}
                </button>
                {!pageExists && (
                  <span className="text-xs text-muted-foreground hidden md:inline">
                    • Nuova pagina
                  </span>
                )}
              </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
              {/* Save Status */}
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                {isSaving && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Salvataggio...</span>
                  </>
                )}
                {saved && (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">Salvato</span>
                  </>
                )}
                {!isSaving && !saved && lastSaved && (
                  <span className="text-xs">
                    Ultimo salvataggio: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>

              <div className="hidden md:flex items-center gap-2">
                <E2EBadge />
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowGitHubBadge(true)}
                      className="inline-flex items-center justify-center rounded-full border-2 border-primary bg-background hover:bg-muted h-10 w-10 transition-colors"
                    >
                      <Github className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t('viewSourceGitHub')}</TooltipContent>
                </Tooltip>
              </div>

              <ThemeToggle />
            </div>
          </div>
        </motion.nav>

        {/* Editor */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-1 flex flex-col md:container md:mx-auto md:px-4 md:py-6"
        >
          <div className="w-full flex-1 md:border-2 md:border-primary md:rounded-xl overflow-hidden bg-card flex flex-col min-h-0">
            <EditorToolbar 
              editor={editor} 
              editorMode={editorMode} 
              onModeChange={handleModeChange}
              codeLanguage={codeLanguage}
              onCodeLanguageChange={setCodeLanguage}
            />
            
            <div className="flex-1 min-h-0 overflow-hidden">
              {editorMode === 'docs' ? (
                <div className="h-full overflow-auto">
                  <EditorContent 
                    editor={editor} 
                    className="h-full"
                  />
                </div>
              ) : (
                <div className="h-full bg-black">
                  <CodeMirror
                    value={contentCode || ''}
                    height="100%"
                    onChange={(value) => setContentCode(value)}
                    theme="dark"
                    extensions={
                      codeLanguage !== 'auto' 
                        ? [getLanguageExtension(codeLanguage)] 
                        : detectedLanguage !== 'auto' 
                          ? [getLanguageExtension(detectedLanguage)]
                          : []
                    }
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLine: true,
                      highlightActiveLineGutter: true,
                      foldGutter: true,
                      autocompletion: true,
                    }}
                    style={{
                      backgroundColor: '#000000',
                      minHeight: '100%',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* GitHub Badge */}
        <GitHubBadge show={showGitHubBadge} onClose={() => setShowGitHubBadge(false)} />

        {/* Mode Change Confirmation Dialog */}
        <AlertDialog open={showModeChangeDialog} onOpenChange={setShowModeChangeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('changeModeTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('changeModeDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelModeChange}>
                {t('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmModeChange}>
                {t('continueAction')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

