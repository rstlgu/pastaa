"use client";

import { useEffect, useRef } from "react";

interface User {
  id: string;
  name: string;
  avatar: string;
  selection?: { start: number; end: number };
}

interface RemoteSelectionsProps {
  users: User[];
  editorMode: 'code' | 'docs';
  content: string;
}

export function RemoteSelections({ users, editorMode, content }: RemoteSelectionsProps) {
  const selectionTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    // Pulisci tutti i timeout precedenti
    selectionTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    selectionTimeoutsRef.current.clear();

    // Rimuovi tutte le selezioni precedenti
    document.querySelectorAll('.remote-selection-highlight').forEach((el) => {
      el.remove();
    });

    users.forEach((user) => {
      if (user.selection && user.selection.start !== user.selection.end) {
        const { start, end } = user.selection;
        
        if (editorMode === 'code') {
          // Per CodeMirror
          const codeEditor = document.querySelector('.cm-content');
          if (codeEditor) {
            // Crea un elemento per evidenziare la selezione
            const highlight = document.createElement('div');
            highlight.className = 'remote-selection-highlight';
            highlight.setAttribute('data-user-id', user.id);
            highlight.style.position = 'absolute';
            highlight.style.backgroundColor = 'rgba(234, 179, 8, 0.3)';
            highlight.style.border = '1px solid rgba(234, 179, 8, 0.6)';
            highlight.style.borderRadius = '2px';
            highlight.style.pointerEvents = 'none';
            highlight.style.zIndex = '5';
            highlight.style.animation = 'remoteSelectionPulse 1s ease-in-out';
            
            // Prova a posizionare l'evidenziazione (semplificato)
            // In produzione usa le API di CodeMirror per calcolare le coordinate
            codeEditor.appendChild(highlight);
            
            // Rimuovi dopo 2 secondi
            const timeout = setTimeout(() => {
              highlight.remove();
            }, 2000);
            selectionTimeoutsRef.current.set(user.id, timeout);
          }
        } else {
          // Per TipTap/ProseMirror
          const proseMirror = document.querySelector('.ProseMirror');
          if (proseMirror) {
            // Crea un marker per evidenziare la selezione
            const highlight = document.createElement('mark');
            highlight.className = 'remote-selection-highlight';
            highlight.setAttribute('data-user-id', user.id);
            highlight.style.backgroundColor = 'rgba(234, 179, 8, 0.3)';
            highlight.style.border = '1px solid rgba(234, 179, 8, 0.6)';
            highlight.style.borderRadius = '2px';
            highlight.style.padding = '2px 0';
            highlight.style.animation = 'remoteSelectionPulse 1s ease-in-out';
            highlight.style.display = 'inline';
            
            // Prova a evidenziare il testo selezionato
            // In produzione usa le API di ProseMirror per posizionare correttamente
            try {
              const textContent = proseMirror.textContent || '';
              if (start < textContent.length && end <= textContent.length) {
                // Semplificato: evidenzia visivamente
                proseMirror.setAttribute('data-remote-selection', `${user.id}:${start}:${end}`);
                
                // Rimuovi dopo 2 secondi
                const timeout = setTimeout(() => {
                  proseMirror.removeAttribute('data-remote-selection');
                }, 2000);
                selectionTimeoutsRef.current.set(user.id, timeout);
              }
            } catch {
              // Ignora errori
            }
          }
        }
      }
    });

    return () => {
      // Copia il valore corrente per evitare warning di React hooks
      const timeouts = new Map(selectionTimeoutsRef.current);
      timeouts.forEach((timeout) => clearTimeout(timeout));
      selectionTimeoutsRef.current.clear();
      document.querySelectorAll('.remote-selection-highlight').forEach((el) => {
        el.remove();
      });
    };
  }, [users, editorMode, content]);

  return null;
}
