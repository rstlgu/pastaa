"use client";

import { useEffect, useRef, useCallback } from 'react';

interface SyncMessage {
  type: 'update' | 'error';
  content?: string;
  updatedAt?: string;
  message?: string;
}

interface UseRealtimeSyncOptions {
  pageId: string;
  onUpdate: (content: string, updatedAt: string) => void;
  enabled?: boolean;
}

export function useRealtimeSync({ 
  pageId, 
  onUpdate, 
  enabled = true 
}: UseRealtimeSyncOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastUpdateRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !pageId) return;

    // Crea connessione SSE
    const eventSource = new EventSource(`/api/public-page/${pageId}/sync`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: SyncMessage = JSON.parse(event.data);
        
        if (data.type === 'update' && data.content && data.updatedAt) {
          // Evita aggiornamenti duplicati
          if (data.updatedAt !== lastUpdateRef.current) {
            lastUpdateRef.current = data.updatedAt;
            onUpdate(data.content, data.updatedAt);
          }
        } else if (data.type === 'error') {
          console.error('Errore sincronizzazione:', data.message);
        }
      } catch (error) {
        console.error('Errore parsing messaggio SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Errore EventSource:', error);
      // Riconnessione automatica gestita da EventSource
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [pageId, enabled, onUpdate]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  return { disconnect };
}

