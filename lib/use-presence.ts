"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { generateFakeName, generateAvatarUrl } from './generate-fake-name';

interface User {
  id: string;
  name: string;
  avatar: string;
  cursor?: { x: number; y: number };
  selection?: { start: number; end: number };
}

interface UsePresenceOptions {
  pageId: string;
  enabled?: boolean;
}

// Genera o recupera un ID utente persistente per la sessione
function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return `user-${Math.random().toString(36).substr(2, 9)}`;
  
  const storageKey = 'pastaa-user-id';
  let userId = sessionStorage.getItem(storageKey);
  
  if (!userId) {
    userId = `user-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
    sessionStorage.setItem(storageKey, userId);
  }
  
  return userId;
}

export function usePresence({ pageId, enabled = true }: UsePresenceOptions) {
  const [users, setUsers] = useState<User[]>([]);
  const userIdRef = useRef<string>(getOrCreateUserId());
  const userAgentRef = useRef<string>(typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const userNameRef = useRef<string>(generateFakeName(userAgentRef.current));
  const userAvatarRef = useRef<string>(generateAvatarUrl(userNameRef.current));
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);
  const pageIdRef = useRef<string>(pageId);

  // Invia heartbeat per indicare presenza
  const sendHeartbeat = useCallback(() => {
    if (!enabled || !pageId) return;
    
    fetch(`/api/public-page/${pageId}/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userIdRef.current,
        name: userNameRef.current,
        avatar: userAvatarRef.current,
      }),
    }).catch(() => {
      // Ignora errori di rete
    });
  }, [pageId, enabled]);

  // Invia posizione cursore
  const sendCursor = useCallback((x: number, y: number) => {
    if (!enabled || !pageId) return;
    
    // Throttle: invia solo se il cursore si è mosso significativamente
    if (lastCursorRef.current) {
      const dx = Math.abs(x - lastCursorRef.current.x);
      const dy = Math.abs(y - lastCursorRef.current.y);
      if (dx < 5 && dy < 5) return; // Non inviare se movimento < 5px
    }
    
    lastCursorRef.current = { x, y };
    
    // Invia sempre con name e avatar per assicurarsi che l'utente esista
    fetch(`/api/public-page/${pageId}/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userIdRef.current,
        name: userNameRef.current,
        avatar: userAvatarRef.current,
        cursor: { x, y },
      }),
    }).catch(() => {
      // Ignora errori di rete
    });
  }, [pageId, enabled]);

  // Invia selezione
  const sendSelection = useCallback((start: number, end: number) => {
    if (!enabled || !pageId) return;
    
    // Invia sempre con name e avatar per assicurarsi che l'utente esista
    fetch(`/api/public-page/${pageId}/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userIdRef.current,
        name: userNameRef.current,
        avatar: userAvatarRef.current,
        selection: { start, end },
      }),
    }).catch(() => {
      // Ignora errori di rete
    });
  }, [pageId, enabled]);

  // Funzione per rimuovere l'utente dalla presenza
  const removePresence = useCallback(() => {
    if (!pageIdRef.current) return;
    
    // Usa sendBeacon per garantire l'invio anche durante unload
    const data = JSON.stringify({ userId: userIdRef.current });
    navigator.sendBeacon?.(
      `/api/public-page/${pageIdRef.current}/presence?action=leave`,
      new Blob([data], { type: 'application/json' })
    );
  }, []);

  useEffect(() => {
    if (!enabled || !pageId) return;
    
    pageIdRef.current = pageId;

    // Invia heartbeat ogni 2 secondi
    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 2000);

    // Polling per ricevere presenza di altri utenti
    const presenceInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/public-page/${pageId}/presence`);
        if (response.ok) {
          const data = await response.json();
          // Filtra il proprio utente
          const otherUsers = (data.users || []).filter(
            (u: User) => u.id !== userIdRef.current
          );
          setUsers(otherUsers);
        }
      } catch {
        // Ignora errori
      }
    }, 500); // Polling ogni 500ms per presenza

    // Rimuovi presenza quando la pagina viene chiusa o ricaricata
    const handleBeforeUnload = () => {
      removePresence();
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        removePresence();
      } else if (document.visibilityState === 'visible') {
        // Riprendi heartbeat quando la pagina torna visibile
        sendHeartbeat();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      clearInterval(presenceInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Rimuovi presenza quando il componente viene smontato
      removePresence();
    };
  }, [pageId, enabled, sendHeartbeat, removePresence]);

  return {
    users,
    userId: userIdRef.current,
    userName: userNameRef.current,
    userAvatar: userAvatarRef.current,
    sendCursor,
    sendSelection,
  };
}

