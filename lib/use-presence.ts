"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { generateFakeName, generateAvatarUrl } from './generate-fake-name';
import { getPusherClient } from './pusher';

interface User {
  id: string;
  name: string;
  avatar: string;
  cursor?: { x: number; y: number };
  selection?: { start: number; end: number };
  lastSeen?: number;
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
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);
  const pageIdRef = useRef<string>(pageId);
  const channelRef = useRef<ReturnType<ReturnType<typeof getPusherClient>['subscribe']> | null>(null);
  const pusherRef = useRef<ReturnType<typeof getPusherClient> | null>(null);
  const userTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const PRESENCE_TIMEOUT = 15000; // 15 secondi prima di rimuovere un utente inattivo

  // Broadcast presenza via Pusher
  const broadcastPresence = useCallback(async (data: Partial<User> & { action?: 'join' | 'leave' }) => {
    if (!enabled || !pageId) return;

    try {
      await fetch(`/api/public-page/${pageId}/broadcast-presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userIdRef.current,
          name: userNameRef.current,
          avatar: userAvatarRef.current,
          ...data,
        }),
      });
    } catch (error) {
      console.error('Errore broadcast presenza:', error);
    }
  }, [pageId, enabled]);

  // Invia posizione cursore
  const sendCursor = useCallback((x: number, y: number) => {
    if (!enabled || !pageId) return;
    
    // Throttle: invia solo se il cursore si è mosso significativamente
    if (lastCursorRef.current) {
      const dx = Math.abs(x - lastCursorRef.current.x);
      const dy = Math.abs(y - lastCursorRef.current.y);
      if (dx < 5 && dy < 5) return;
    }
    
    lastCursorRef.current = { x, y };
    broadcastPresence({ cursor: { x, y } });
  }, [pageId, enabled, broadcastPresence]);

  // Invia selezione
  const sendSelection = useCallback((start: number, end: number) => {
    if (!enabled || !pageId) return;
    broadcastPresence({ selection: { start, end } });
  }, [pageId, enabled, broadcastPresence]);

  // Rimuovi presenza
  const removePresence = useCallback(() => {
    if (!pageIdRef.current) return;
    
    const data = JSON.stringify({ 
      userId: userIdRef.current,
      action: 'leave'
    });
    
    navigator.sendBeacon?.(
      `/api/public-page/${pageIdRef.current}/broadcast-presence`,
      new Blob([data], { type: 'application/json' })
    );
  }, []);

  // Pulisci timeout per un utente
  const clearUserTimeout = useCallback((userId: string) => {
    const timeout = userTimeoutsRef.current.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      userTimeoutsRef.current.delete(userId);
    }
  }, []);

  // Imposta timeout per rimuovere utente inattivo
  const setUserTimeout = useCallback((userId: string) => {
    clearUserTimeout(userId);
    
    const timeout = setTimeout(() => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      userTimeoutsRef.current.delete(userId);
    }, PRESENCE_TIMEOUT);
    
    userTimeoutsRef.current.set(userId, timeout);
  }, [clearUserTimeout]);

  useEffect(() => {
    if (!enabled || !pageId) return;
    
    pageIdRef.current = pageId;

    // Ottieni istanza Pusher
    const pusher = getPusherClient();
    pusherRef.current = pusher;

    // Subscribe al canale della pagina
    const channel = pusher.subscribe(`page-${pageId}`);
    channelRef.current = channel;

    // Listener per nuovi utenti
    channel.bind('presence-join', (data: { userId: string; name: string; avatar: string; timestamp: number }) => {
      if (data.userId === userIdRef.current) return;
      
      setUsers(prev => {
        const filtered = prev.filter(u => u.id !== data.userId);
        return [...filtered, { 
          id: data.userId, 
          name: data.name, 
          avatar: data.avatar,
          lastSeen: Date.now() 
        }];
      });
      
      setUserTimeout(data.userId);
    });

    // Listener per aggiornamenti presenza
    channel.bind('presence-update', (data: { userId: string; name?: string; avatar?: string; cursor?: { x: number; y: number }; selection?: { start: number; end: number }; timestamp: number }) => {
      if (data.userId === userIdRef.current) return;
      
      setUsers(prev => {
        const existingIndex = prev.findIndex(u => u.id === data.userId);
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...(data.name && { name: data.name }),
            ...(data.avatar && { avatar: data.avatar }),
            ...(data.cursor !== undefined && { cursor: data.cursor }),
            ...(data.selection !== undefined && { selection: data.selection }),
            lastSeen: Date.now(),
          };
          return updated;
        } else if (data.name && data.avatar) {
          // Aggiungi nuovo utente solo se abbiamo name e avatar
          return [...prev, {
            id: data.userId,
            name: data.name,
            avatar: data.avatar,
            cursor: data.cursor,
            selection: data.selection,
            lastSeen: Date.now(),
          }];
        }
        
        return prev;
      });
      
      setUserTimeout(data.userId);
    });

    // Listener per utenti che se ne vanno
    channel.bind('presence-leave', (data: { userId: string }) => {
      if (data.userId === userIdRef.current) return;
      
      clearUserTimeout(data.userId);
      setUsers(prev => prev.filter(u => u.id !== data.userId));
    });

    // Annuncia la propria presenza
    broadcastPresence({ action: 'join' });

    // Heartbeat ogni 5 secondi
    const heartbeatInterval = setInterval(() => {
      broadcastPresence({});
    }, 5000);

    // Cleanup automatico degli utenti inattivi ogni 5 secondi
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setUsers(prev => prev.filter(u => {
        const inactive = u.lastSeen && (now - u.lastSeen) > PRESENCE_TIMEOUT;
        if (inactive) {
          clearUserTimeout(u.id);
        }
        return !inactive;
      }));
    }, 5000);

    // Event listeners per rimuovere presenza
    const handleBeforeUnload = () => {
      removePresence();
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        removePresence();
      } else if (document.visibilityState === 'visible') {
        broadcastPresence({ action: 'join' });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(cleanupInterval);
      
      // Pulisci tutti i timeout
      userTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      userTimeoutsRef.current.clear();
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (channelRef.current) {
        channelRef.current.unbind_all();
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      
      removePresence();
    };
  }, [pageId, enabled, broadcastPresence, removePresence, clearUserTimeout, setUserTimeout]);

  return {
    users,
    userId: userIdRef.current,
    userName: userNameRef.current,
    userAvatar: userAvatarRef.current,
    sendCursor,
    sendSelection,
  };
}
