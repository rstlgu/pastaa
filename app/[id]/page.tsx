"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Copy, Share2, Users, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { GitHubBadge } from "@/components/github-badge";
import { PastaLogo } from "@/components/pasta-logo";
import { useLanguage } from "@/components/language-provider";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { useRealtimeSync } from '@/lib/use-realtime-sync';
import { usePresence } from '@/lib/use-presence';
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from '@/components/ui/avatar';
import { RemoteCursors } from '@/components/remote-cursors';
import { RemoteSelections } from '@/components/remote-selections';
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
import { EditorView } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet } from '@codemirror/view';

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
  const pageId = params.id as string;
  
  const [contentDocs, setContentDocs] = useState("");
  const [contentCode, setContentCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pageExists, setPageExists] = useState(false);
  const [editorMode, setEditorMode] = useState<'code' | 'docs'>('code');
  const [codeLanguage, setCodeLanguage] = useState<string>('auto');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('auto');
  const [showModeChangeDialog, setShowModeChangeDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<'code' | 'docs' | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showUsersSheet, setShowUsersSheet] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const creatorKeyRef = useRef<string>(`creator-${pageId}`);
  const lastSavedContentRef = useRef<string>("");
  const isLocalChangeRef = useRef(false);
  const previousContentRef = useRef<{ docs: string; code: string }>({ docs: '', code: '' });
  const codeMirrorViewRef = useRef<EditorView | null>(null);
  const broadcastRef = useRef<((content: string, userId: string, editorMode: 'code' | 'docs') => Promise<void>) | null>(null);
  const presenceUserIdRef = useRef<string>('');

  // Carica il contenuto della pagina
  useEffect(() => {
    async function loadPage() {
      try {
        const response = await fetch(`/api/public-page?id=${encodeURIComponent(pageId)}`);
        
        // Controlla se la risposta è ok prima di parsare
        if (!response.ok) {
          // Se la risposta non è ok, tratta come pagina nuova
          setPageExists(false);
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        
        // Controlla se c'è un errore nella risposta
        if (data.error) {
          console.error('Errore API:', data.error);
          setPageExists(false);
          setIsLoading(false);
          return;
        }
        
        if (data.content) {
          let loadedDocs = '<p></p>';
          let loadedCode = '';
          
          // Prova a parsare come JSON per vedere se ha contenuti separati
          try {
            const parsed = JSON.parse(data.content);
            if (parsed.docs !== undefined && parsed.code !== undefined) {
              loadedDocs = parsed.docs || '<p></p>';
              loadedCode = parsed.code || '';
              lastSavedContentRef.current = data.content;
            } else {
              // Vecchio formato - usa come code
              loadedCode = data.content;
              lastSavedContentRef.current = data.content;
            }
          } catch {
            // Non è JSON, è testo semplice - usa come code
            loadedCode = data.content;
            lastSavedContentRef.current = data.content;
          }
          
          setContentDocs(loadedDocs);
          setContentCode(loadedCode);
          previousContentRef.current = { docs: loadedDocs, code: loadedCode };
          
          // Determina automaticamente la modalità in base al contenuto
          const hasCodeContent = loadedCode.trim().length > 0;
          const hasDocsContent = loadedDocs.replace(/<p><\/p>/g, '').replace(/<p>\s*<\/p>/g, '').trim().length > 0;
          
          if (hasCodeContent && !hasDocsContent) {
            setEditorMode('code');
          } else if (hasDocsContent && !hasCodeContent) {
            setEditorMode('docs');
          } else if (hasCodeContent && hasDocsContent) {
            // Se entrambi hanno contenuto, usa code (ma potremmo usare l'ultimo modificato)
            setEditorMode('code');
          }
          // Altrimenti rimane 'code' (default)
          
          setPageExists(data.exists);
          if (data.updatedAt) {
            setLastSaved(new Date(data.updatedAt));
          }
          if (data.expiresAt) {
            setExpiresAt(new Date(data.expiresAt));
          }
          // Controlla se l'utente è il creatore
          if (typeof window !== 'undefined') {
            const creatorFlag = sessionStorage.getItem(creatorKeyRef.current);
            setIsCreator(creatorFlag === 'true');
          }
        } else {
          // Nessun contenuto, pagina nuova
          setPageExists(data.exists || false);
        }
      } catch (error) {
        console.error('Errore caricamento pagina:', error);
        // In caso di errore, tratta come pagina nuova
        setPageExists(false);
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
    
    // Non salvare se entrambi i contenuti sono vuoti (ma permettere salvataggio di contenuto vuoto se c'era prima)
    const isEmpty = !contentDocs.replace(/<p><\/p>/g, '').replace(/<p>\s*<\/p>/g, '').trim() && !contentCode.trim();
    if (isEmpty && !pageExists) return;
    
    setIsSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/public-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: pageId, 
          content: contentToSave,
          // Invia expiresIn solo quando la pagina è nuova (default 24h)
          ...(!pageExists ? { expiresIn: 24 * 60 * 60 * 1000 } : {}),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        lastSavedContentRef.current = contentToSave;
        setLastSaved(new Date(data.updatedAt));
        if (data.expiresAt) {
          setExpiresAt(new Date(data.expiresAt));
        }
        setSaved(true);
        setSaveError(false);
        // Se la pagina non esisteva prima, l'utente corrente è il creatore
        if (!pageExists && typeof window !== 'undefined') {
          sessionStorage.setItem(creatorKeyRef.current, 'true');
          setIsCreator(true);
        }
        setPageExists(true);
        
        // Broadcast update via Pusher agli altri utenti
        if (broadcastRef.current && presenceUserIdRef.current) {
          broadcastRef.current(contentToSave, presenceUserIdRef.current, editorMode);
        }
        
        // Mostra il testo "Salvato" per 2 secondi
        setTimeout(() => setSaved(false), 2000);
      } else {
        // Se la risposta non è ok, mostra errore
        const errorData = await response.json().catch(() => ({}));
        console.error('Errore salvataggio:', errorData);
        setSaveError(true);
        setSaved(false);
        // Mostra il testo "Error" per 2 secondi
        setTimeout(() => setSaveError(false), 2000);
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
      setSaveError(true);
      setSaved(false);
      // Mostra il testo "Error" per 2 secondi
      setTimeout(() => setSaveError(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }, [contentDocs, contentCode, pageId, pageExists, editorMode]);

  // Auto-save ogni 3 secondi dopo modifiche
  useEffect(() => {
    const contentToSave = JSON.stringify({ docs: contentDocs, code: contentCode });
    if (isSaving || contentToSave === lastSavedContentRef.current) return;
    
    // Non salvare se entrambi i contenuti sono vuoti su una pagina nuova
    const isEmpty = !contentDocs.replace(/<p><\/p>/g, '').replace(/<p>\s*<\/p>/g, '').trim() && !contentCode.trim();
    if (isEmpty && !pageExists) return;
    
    isLocalChangeRef.current = true;
    
    const timer = setTimeout(() => {
      handleSave().catch((error) => {
        // Silenzia gli errori di database durante lo sviluppo
        console.warn('Salvataggio automatico fallito (database non configurato?):', error);
      });
      // Reset dopo il salvataggio
      setTimeout(() => {
        isLocalChangeRef.current = false;
      }, 1000);
    }, 3000);

    return () => clearTimeout(timer);
  }, [contentDocs, contentCode, isSaving, handleSave, pageExists]);

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
  }, [editor, isLoading, contentDocs]);

  // Effetto per evidenziare nuovo testo in CodeMirror
  const highlightNewTextEffect = StateEffect.define<{ from: number; to: number }>();

  const highlightNewTextField = StateField.define<DecorationSet>({
    create() {
      return Decoration.none;
    },
    update(decorations, tr) {
      decorations = decorations.map(tr.changes);
      for (const effect of tr.effects) {
        if (effect.is(highlightNewTextEffect)) {
          const { from, to } = effect.value;
          const highlight = Decoration.mark({
            class: 'cm-remote-highlight',
            attributes: { 'data-remote-update': 'true' },
          });
          decorations = decorations.update({
            add: [highlight.range(from, to)],
          });
        }
      }
      return decorations;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  // Funzione per trovare le differenze tra due testi
  const findTextDifferences = (oldText: string, newText: string): Array<{ from: number; to: number }> => {
    const differences: Array<{ from: number; to: number }> = [];
    
    // Se il nuovo testo è più lungo, evidenzia la parte aggiunta
    if (newText.length > oldText.length) {
      // Trova dove inizia la differenza
      let startDiff = 0;
      while (startDiff < oldText.length && oldText[startDiff] === newText[startDiff]) {
        startDiff++;
      }
      
      // Trova dove finisce la differenza (dal fondo)
      let endOld = oldText.length;
      let endNew = newText.length;
      while (endOld > startDiff && endNew > startDiff && 
             oldText[endOld - 1] === newText[endNew - 1]) {
        endOld--;
        endNew--;
      }
      
      if (endNew > startDiff) {
        differences.push({ from: startDiff, to: endNew });
      }
    } else if (newText !== oldText) {
      // Se il testo è cambiato ma non più lungo, evidenzia tutto il nuovo testo
      differences.push({ from: 0, to: newText.length });
    }
    
    return differences;
  };

  // Sistema di presenza utenti
  const presence = usePresence({
    pageId,
    enabled: !isLoading && pageExists,
  });

  // Aggiorna i ref quando cambiano
  useEffect(() => {
    presenceUserIdRef.current = presence.userId;
  }, [presence.userId]);

  // Sincronizzazione in tempo reale
  const handleRemoteUpdate = useCallback((content: string, remoteUserId: string) => {
    // Evita aggiornamenti se è il proprio update
    if (remoteUserId === presenceUserIdRef.current) {
      return;
    }

    // Evita aggiornamenti se l'utente sta modificando localmente
    if (isLocalChangeRef.current) {
      return;
    }

    try {
      const parsed = JSON.parse(content);
      if (parsed.docs !== undefined && parsed.code !== undefined) {
        // Aggiorna solo se il contenuto è diverso
        const currentContent = JSON.stringify({ docs: contentDocs, code: contentCode });
        if (content !== currentContent) {
          const newDocs = parsed.docs || '<p></p>';
          const newCode = parsed.code || '';
          
          // Aggiorna contenuti
          setContentDocs(newDocs);
          setContentCode(newCode);
          lastSavedContentRef.current = content;
          
          // Evidenzia nuovo testo per CodeMirror
          if (editorMode === 'code' && newCode !== previousContentRef.current.code) {
            const differences = findTextDifferences(previousContentRef.current.code, newCode);
            if (differences.length > 0) {
              // Evidenzia dopo un breve delay per permettere il rendering
              setTimeout(() => {
                if (codeMirrorViewRef.current) {
                  const effects = differences.map(diff => 
                    highlightNewTextEffect.of({ from: diff.from, to: diff.to })
                  );
                  codeMirrorViewRef.current.dispatch({
                    effects,
                  });
                  
                  // Rimuovi evidenziazione dopo 2 secondi
                  setTimeout(() => {
                    if (codeMirrorViewRef.current) {
                      codeMirrorViewRef.current.dispatch({
                        effects: [],
                      });
                    }
                  }, 2000);
                }
              }, 100);
            }
          }
          
          // Evidenzia nuovo testo per TipTap
          if (editorMode === 'docs' && editor && newDocs !== previousContentRef.current.docs) {
            editor.commands.setContent(newDocs);
            
            // Aggiungi classe temporanea per evidenziare
            setTimeout(() => {
              const proseMirror = document.querySelector('.ProseMirror');
              if (proseMirror) {
                proseMirror.classList.add('remote-update');
                setTimeout(() => {
                  proseMirror.classList.remove('remote-update');
                }, 2000);
              }
            }, 100);
          }
          
          // Aggiorna riferimento al contenuto precedente
          previousContentRef.current = { docs: newDocs, code: newCode };
        }
      }
    } catch {
      // Se non è JSON, ignora
    }
  }, [contentDocs, contentCode, editor, editorMode]);

  // Attiva sincronizzazione solo dopo il caricamento iniziale
  const { broadcast } = useRealtimeSync({
    pageId,
    onUpdate: handleRemoteUpdate,
    enabled: !isLoading && pageExists,
  });

  // Aggiorna il ref quando broadcast cambia
  useEffect(() => {
    broadcastRef.current = broadcast;
  }, [broadcast]);

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

  // Apri il bottom sheet per condividere
  const openShareSheet = () => {
    setShowShareSheet(true);
  };

  // Copia l'URL completo nella clipboard
  const copyFullUrl = async () => {
    try {
      const fullUrl = `${window.location.origin}/${pageId}`;
      await navigator.clipboard.writeText(fullUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Errore copia:', error);
    }
  };

  // Condividi link usando native share API
  const shareLink = async () => {
    const fullUrl = `${window.location.origin}/${pageId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t('appName')} - ${pageId}`,
          url: fullUrl,
        });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      copyFullUrl();
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
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Navbar */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b-2 border-primary bg-card/50 backdrop-blur-sm sticky top-0 z-50 relative"
        >
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            {/* Left - Logo + Page ID */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <PastaLogo className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                <span className="font-bold font-righteous text-lg md:text-xl">Pastaa</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <button
                  onClick={openShareSheet}
                  className={`px-3 py-1 bg-muted rounded-lg font-mono border-2 border-primary/30 hover:bg-muted/80 transition-colors cursor-pointer ${
                    pageId.length <= 8 
                      ? 'text-sm' 
                      : pageId.length <= 13 
                        ? 'text-xs' 
                        : 'text-[11px]'
                  }`}
                >
                  /{pageId.length > 13 ? `${pageId.slice(0, 13)}..` : pageId}
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

              {/* Avatar altri utenti - Mobile: sotto la navbar, Desktop: nella navbar */}
              {presence.users.length > 0 && (
                <div 
                  className="md:hidden absolute top-full left-0 right-0 bg-card/95 backdrop-blur-sm border-b border-primary/20 px-4 py-2 flex items-center gap-2 cursor-pointer"
                  onClick={() => setShowUsersSheet(true)}
                >
                  <AvatarGroup>
                    {presence.users.map((user) => (
                      <Avatar key={user.id}>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </AvatarGroup>
                  <span className="text-xs text-muted-foreground">
                    {presence.users.length} {presence.users.length === 1 ? 'utente' : 'utenti'} online
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* Avatar altri utenti - Desktop */}
                {presence.users.length > 0 && (
                  <div className="hidden md:flex items-center gap-2">
                    <div className="flex -space-x-2 *:data-[slot=avatar]:ring-background *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale mr-2">
                      {presence.users.map((user) => (
                        <Tooltip key={user.id}>
                          <TooltipTrigger asChild>
                            <Avatar className="cursor-pointer">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{user.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Expiration Timer Icon - styled like GitHub badge */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowExpirationModal(true)}
                      className={`inline-flex items-center justify-center rounded-full border-2 ${
                        expiresAt ? 'border-primary' : 'border-muted-foreground/50'
                      } bg-background hover:bg-muted h-10 w-10 transition-colors relative`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={expiresAt ? "text-primary" : "text-muted-foreground"}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('contentDuration')}</p>
                  </TooltipContent>
                </Tooltip>
                
                {/* GitHub Badge - hidden on mobile */}
                <div className="hidden md:block">
                  <GitHubBadge />
                </div>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </motion.nav>

        {/* Editor */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`flex-1 flex flex-col md:container md:mx-auto md:px-4 md:py-6 ${presence.users.length > 0 ? 'pt-14 md:pt-6' : ''}`}
        >
          <div className="w-full flex-1 md:border-2 md:border-primary md:rounded-xl overflow-hidden bg-card flex flex-col min-h-0">
            <EditorToolbar 
              editor={editor} 
              editorMode={editorMode} 
              onModeChange={handleModeChange}
              codeLanguage={codeLanguage}
              onCodeLanguageChange={setCodeLanguage}
            />
            
            <div 
              className="flex-1 min-h-0 overflow-hidden relative"
              onMouseMove={(e) => {
                if (presence.sendCursor) {
                  presence.sendCursor(e.clientX, e.clientY);
                }
              }}
            >
              {editorMode === 'docs' ? (
                <div className="h-full overflow-auto">
                  <EditorContent 
                    editor={editor} 
                    className="h-full"
                  />
                </div>
              ) : (
                <div className="h-full" style={{ backgroundColor: theme === 'dark' ? 'hsl(0, 0%, 5%)' : '#f5f5f5' }}>
                  <CodeMirror
                    value={contentCode || ''}
                    height="100%"
                    onChange={(value) => setContentCode(value)}
                    theme={theme === 'dark' ? 'dark' : 'light'}
                    extensions={[
                      ...(codeLanguage !== 'auto' 
                        ? [getLanguageExtension(codeLanguage)] 
                        : detectedLanguage !== 'auto' 
                          ? [getLanguageExtension(detectedLanguage)]
                          : []),
                      highlightNewTextField,
                      EditorView.updateListener.of((update) => {
                        // Salva riferimento alla view di CodeMirror
                        if (update.view) {
                          codeMirrorViewRef.current = update.view;
                        }
                        
                        // Traccia selezione per CodeMirror
                        if (update.selectionSet && presence.sendSelection && editorMode === 'code') {
                          const selection = update.state.selection.main;
                          if (selection.from !== selection.to) {
                            presence.sendSelection(selection.from, selection.to);
                          }
                        }
                      }),
                    ]}
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLine: true,
                      highlightActiveLineGutter: true,
                      foldGutter: true,
                      autocompletion: true,
                    }}
                    style={{
                      backgroundColor: theme === 'dark' ? 'hsl(0, 0%, 5%)' : '#f5f5f5',
                      minHeight: '100%',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>

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

        {/* Share Dialog - Desktop Only */}
        {typeof window !== 'undefined' && window.innerWidth >= 768 && (
          <AlertDialog open={showShareSheet} onOpenChange={setShowShareSheet}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>{t('shareLink')}</AlertDialogTitle>
              </AlertDialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-start gap-2 bg-muted rounded-lg p-3 border-2">
                  <p className="flex-1 font-mono text-xs break-all leading-relaxed max-w-[350px]">
                    {typeof window !== 'undefined' && `${window.location.origin}/${pageId}`}
                  </p>
                  <button
                    onClick={copyFullUrl}
                    className="flex-shrink-0 hover:bg-primary/10 h-8 w-8 rounded-md flex items-center justify-center transition-colors"
                  >
                    {linkCopied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Expiration Info */}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={expiresAt ? "text-primary" : "text-muted-foreground"}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="text-sm">
                      {expiresAt ? (
                        <>
                          <span className="text-muted-foreground">{t('expiresIn')}: </span>
                          <span className="font-medium">
                            {(() => {
                              const diff = expiresAt.getTime() - Date.now();
                              if (diff <= 0) return t('expired');
                              const hours = Math.floor(diff / (1000 * 60 * 60));
                              const days = Math.floor(hours / 24);
                              if (days > 0) return `${days} ${days === 1 ? t('day') : t('days')}`;
                              if (hours > 0) return `${hours} ${hours === 1 ? t('hour') : t('hours')}`;
                              const minutes = Math.floor(diff / (1000 * 60));
                              return `${minutes} ${minutes === 1 ? t('minute') : t('minutes')}`;
                            })()}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{t('never')}</span>
                      )}
                    </span>
                  </div>
                  {isCreator && (
                    <button
                      onClick={() => {
                        setShowShareSheet(false);
                        setTimeout(() => setShowExpirationModal(true), 150);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {t('changeExpiration')}
                    </button>
                  )}
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={shareLink}>
                  <Share2 className="mr-2 h-4 w-4" />
                  {t('shareLink')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Expiration Modal */}
        <AlertDialog open={showExpirationModal} onOpenChange={setShowExpirationModal}>
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {t('expirationSettings')}
              </AlertDialogTitle>
            </AlertDialogHeader>
            
            <div className="space-y-4">
              {expiresAt ? (
                <>
                  {/* Data scadenza */}
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('expirationDate')}</span>
                      <span className="text-sm font-medium">
                        {expiresAt.toLocaleDateString()} {expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('timeRemaining')}</span>
                      <span className="text-sm font-medium text-primary">
                        {(() => {
                          const diff = expiresAt.getTime() - Date.now();
                          if (diff <= 0) return t('expired');
                          const hours = Math.floor(diff / (1000 * 60 * 60));
                          const days = Math.floor(hours / 24);
                          const remainingHours = hours % 24;
                          if (days > 0) return `${days} ${days === 1 ? t('day') : t('days')} ${remainingHours > 0 ? `${remainingHours}h` : ''}`;
                          if (hours > 0) return `${hours} ${hours === 1 ? t('hour') : t('hours')}`;
                          const minutes = Math.floor(diff / (1000 * 60));
                          return `${minutes} ${minutes === 1 ? t('minute') : t('minutes')}`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Cambia scadenza - solo per il creatore */}
                  {isCreator ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{t('changeExpiration')}</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: t('duration1Hour'), value: 1 * 60 * 60 * 1000 },
                          { label: t('duration6Hours'), value: 6 * 60 * 60 * 1000 },
                          { label: t('duration24Hours'), value: 24 * 60 * 60 * 1000 },
                          { label: t('duration7Days'), value: 7 * 24 * 60 * 60 * 1000 },
                          { label: t('duration30Days'), value: 30 * 24 * 60 * 60 * 1000 },
                          { label: t('never'), value: -1 },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/public-page', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 
                                    id: pageId, 
                                    content: JSON.stringify({ docs: contentDocs, code: contentCode }),
                                    updateExpiration: option.value,
                                  }),
                                });
                                if (response.ok) {
                                  const data = await response.json();
                                  if (data.expiresAt) {
                                    setExpiresAt(new Date(data.expiresAt));
                                  } else {
                                    setExpiresAt(null);
                                  }
                                }
                              } catch (error) {
                                console.error('Errore aggiornamento scadenza:', error);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                              option.value === -1 
                                ? 'bg-muted/50 hover:bg-destructive/20 hover:text-destructive border border-dashed border-muted-foreground/30' 
                                : 'bg-muted hover:bg-primary hover:text-primary-foreground'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {t('onlyCreatorCanChange')}
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                    <p className="text-sm font-medium text-primary">{t('defaultExpiration')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('contentDurationDescription')}</p>
                  </div>
                  
                  {/* Imposta scadenza - per pagine senza scadenza */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{t('changeExpiration')}</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: t('duration1Hour'), value: 1 * 60 * 60 * 1000 },
                        { label: t('duration6Hours'), value: 6 * 60 * 60 * 1000 },
                        { label: t('duration24Hours'), value: 24 * 60 * 60 * 1000 },
                        { label: t('duration7Days'), value: 7 * 24 * 60 * 60 * 1000 },
                        { label: t('duration30Days'), value: 30 * 24 * 60 * 60 * 1000 },
                        { label: t('never'), value: -1 },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/public-page', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  id: pageId, 
                                  content: JSON.stringify({ docs: contentDocs, code: contentCode }),
                                  updateExpiration: option.value,
                                }),
                              });
                              if (response.ok) {
                                const data = await response.json();
                                if (data.expiresAt) {
                                  setExpiresAt(new Date(data.expiresAt));
                                } else {
                                  setExpiresAt(null);
                                }
                                // Imposta come creatore se ha impostato la scadenza
                                if (typeof window !== 'undefined') {
                                  sessionStorage.setItem(creatorKeyRef.current, 'true');
                                  setIsCreator(true);
                                }
                              }
                            } catch (error) {
                              console.error('Errore impostazione scadenza:', error);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                            option.value === -1 
                              ? 'bg-muted/50 hover:bg-destructive/20 hover:text-destructive border border-dashed border-muted-foreground/30' 
                              : 'bg-muted hover:bg-primary hover:text-primary-foreground'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogAction>{t('close')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Share Bottom Sheet - Mobile Only */}
        <AnimatePresence>
          {showShareSheet && typeof window !== 'undefined' && window.innerWidth < 768 && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowShareSheet(false)}
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
                      <Share2 className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{t('shareLink')}</h2>
                      <p className="text-xs text-muted-foreground">{t('shareDescription')}</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    {/* Link Display */}
                    <div className="flex items-start gap-2 bg-muted rounded-lg p-4 border-2">
                      <p className="flex-1 font-mono text-sm break-all leading-relaxed">
                        {typeof window !== 'undefined' && `${window.location.origin}/${pageId}`}
                      </p>
                      <button
                        onClick={copyFullUrl}
                        className="flex-shrink-0 hover:bg-primary/10 h-10 w-10 rounded-md flex items-center justify-center transition-colors"
                      >
                        {linkCopied ? (
                          <Check className="h-5 w-5 text-primary" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {/* Expiration Info - Mobile */}
                    <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4 border">
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                          expiresAt ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 bg-muted'
                        }`}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={expiresAt ? "text-primary" : "text-muted-foreground"}
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {expiresAt ? (
                              <>
                                {(() => {
                                  const diff = expiresAt.getTime() - Date.now();
                                  if (diff <= 0) return t('expired');
                                  const hours = Math.floor(diff / (1000 * 60 * 60));
                                  const days = Math.floor(hours / 24);
                                  if (days > 0) return `${days} ${days === 1 ? t('day') : t('days')}`;
                                  if (hours > 0) return `${hours} ${hours === 1 ? t('hour') : t('hours')}`;
                                  const minutes = Math.floor(diff / (1000 * 60));
                                  return `${minutes} ${minutes === 1 ? t('minute') : t('minutes')}`;
                                })()}
                              </>
                            ) : (
                              t('never')
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{t('contentDuration')}</p>
                        </div>
                      </div>
                      {isCreator && (
                        <button
                          onClick={() => {
                            setShowShareSheet(false);
                            setTimeout(() => setShowExpirationModal(true), 150);
                          }}
                          className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
                        >
                          {t('changeExpiration')}
                        </button>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <button
                        onClick={shareLink}
                        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg border-2 border-primary flex items-center justify-center gap-2 font-medium transition-colors"
                      >
                        <Share2 className="h-5 w-5" />
                        {t('shareLink')}
                      </button>
                      
                      <button
                        onClick={() => setShowShareSheet(false)}
                        className="w-full h-12 border-2 border-border rounded-lg hover:bg-muted transition-colors font-medium"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Notifica "Salvato" / "Error" - bottom center */}
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
            >
              <p className="text-sm font-medium" style={{ color: '#eab308' }}>
                {t('saved')}
              </p>
            </motion.div>
          )}
          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
            >
              <p className="text-xs text-muted-foreground/60">
                {t('error')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cursori remoti */}
        <RemoteCursors users={presence.users} />

        {/* Selezioni remote */}
        <RemoteSelections 
          users={presence.users} 
          editorMode={editorMode}
          content={editorMode === 'code' ? contentCode : contentDocs}
        />

        {/* Users Bottom Sheet - Mobile Only */}
        <AnimatePresence>
          {showUsersSheet && typeof window !== 'undefined' && window.innerWidth < 768 && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowUsersSheet(false)}
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
                      <Users className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">Utenti Online</h2>
                      <p className="text-xs text-muted-foreground">
                        {presence.users.length} {presence.users.length === 1 ? 'utente' : 'utenti'} connesso{presence.users.length > 1 ? 'i' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowUsersSheet(false)}
                      className="h-10 w-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Users List */}
                  <div className="space-y-3">
                    {presence.users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:bg-muted/50 transition-colors"
                      >
                        <Avatar>
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">Online</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

