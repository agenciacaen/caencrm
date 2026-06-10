import { useState, useEffect, useRef, useCallback } from 'react';

export type WsConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WsEvent {
  event: string;
  data: Record<string, unknown>;
}

interface UseChatwootSocketOptions {
  pubsubToken: string | null;
  onEvent?: (event: WsEvent) => void;
}

export function useChatwootSocket({ pubsubToken, onEvent }: UseChatwootSocketOptions) {
  const [status, setStatus] = useState<WsConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!pubsubToken) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');

    const chatwootUrl = import.meta.env.VITE_CHATWOOT_URL || 'https://chatwoot.agenciacaen.com.br';
    const wsUrl = chatwootUrl.replace(/^http/, 'ws') + '/cable';

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    let pingTimer: number | null = null;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        command: 'subscribe',
        identifier: JSON.stringify({
          channel: 'RoomChannel',
          pubsub_token: pubsubToken,
        }),
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'ping') return;
        if (data.type === 'welcome') { setStatus('connected'); return; }
        if (data.type === 'confirm_subscription') return;
        if (data.type === 'reject_subscription') { setStatus('error'); ws.close(); return; }

        if (data.message && data.identifier) {
          onEventRef.current?.(data.message as WsEvent);
        }
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      if (pingTimer) clearTimeout(pingTimer);
      reconnectTimerRef.current = window.setTimeout(() => { connect(); }, 5000);
    };

    ws.onerror = () => {
      setStatus('error');
      ws.close();
    };
  }, [pubsubToken]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [connect]);

  return { status };
}
