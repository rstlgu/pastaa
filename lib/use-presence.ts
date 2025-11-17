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

export function usePresence({ pageId, enabled = true }: UsePresenceOptions) {
  const [users, setUsers] = useState<User[]>([]);
  const userIdRef = useRef<string>(`user-${Math.random().toString(36).substr(2, 9)}`);
  const userAgentRef = useRef<string>(typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const userNameRef = useRef<string>(generateFakeName(userAgentRef.current));
  const userAvatarRef = useRef<string>(generateAvatarUrl(userNameRef.current));
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);

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
        userAgent: userAgentRef.current,
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
    
    fetch(`/api/public-page/${pageId}/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userIdRef.current,
        cursor: { x, y },
      }),
    }).catch(() => {
      // Ignora errori di rete
    });
  }, [pageId, enabled]);

  // Invia selezione
  const sendSelection = useCallback((start: number, end: number) => {
    if (!enabled || !pageId) return;
    
    fetch(`/api/public-page/${pageId}/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userIdRef.current,
        selection: { start, end },
      }),
    }).catch(() => {
      // Ignora errori di rete
    });
  }, [pageId, enabled]);

  useEffect(() => {
    if (!enabled || !pageId) return;

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

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      clearInterval(presenceInterval);
    };
  }, [pageId, enabled, sendHeartbeat]);

  return {
    users,
    userId: userIdRef.current,
    userName: userNameRef.current,
    userAvatar: userAvatarRef.current,
    sendCursor,
    sendSelection,
  };
}

