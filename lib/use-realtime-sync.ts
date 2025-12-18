"use client";

import { useEffect, useRef, useCallback } from 'react';
import { getPusherClient } from './pusher';

interface ContentUpdate {
  content: string;
  userId: string;
  editorMode: 'code' | 'docs';
  timestamp: number;
}

interface UseRealtimeSyncOptions {
  pageId: string;
  onUpdate: (content: string, userId: string) => void;
  enabled?: boolean;
}

export function useRealtimeSync({ 
  pageId, 
  onUpdate, 
  enabled = true 
}: UseRealtimeSyncOptions) {
  const channelRef = useRef<ReturnType<ReturnType<typeof getPusherClient>['subscribe']> | null>(null);
  const pusherRef = useRef<ReturnType<typeof getPusherClient> | null>(null);

  useEffect(() => {
    if (!enabled || !pageId) return;

    // Ottieni istanza Pusher
    const pusher = getPusherClient();
    pusherRef.current = pusher;

    // Subscribe al canale della pagina
    const channel = pusher.subscribe(`page-${pageId}`);
    channelRef.current = channel;

    // Listener per aggiornamenti contenuto
    channel.bind('content-update', (data: ContentUpdate) => {
      onUpdate(data.content, data.userId);
    });

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [pageId, enabled, onUpdate]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unbind_all();
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  const broadcast = useCallback(async (content: string, userId: string, editorMode: 'code' | 'docs') => {
    if (!pageId) return;

    try {
      await fetch(`/api/public-page/${pageId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, userId, editorMode }),
      });
    } catch (error) {
      console.error('Errore broadcast:', error);
    }
  }, [pageId]);

  return { disconnect, broadcast };
}
