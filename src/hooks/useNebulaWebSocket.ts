import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export type StatusUpdatePayload = {
  leadId: string;
  leadName: string;
  oldStatus: string;
  newStatus: string;
  newStatusLabel?: string;
  organizationId?: string;
  timestamp: string;
  source?: string;
};

const WS_URL =
  import.meta.env.VITE_NEBULA_WS_URL || "http://localhost:3000";
const WS_PATH = "/ws";

type UseNebulaWebSocketOptions = {
  /** Chamado quando um status_update é recebido (próprio ou de outro cliente). Use para atualizar o estado dos leads no dashboard. */
  onStatusUpdate?: (payload: StatusUpdatePayload) => void;
};

export function useNebulaWebSocket(
  organizationId: string | undefined,
  options: UseNebulaWebSocketOptions = {}
) {
  const { onStatusUpdate } = options;
  const onStatusUpdateRef = useRef(onStatusUpdate);
  onStatusUpdateRef.current = onStatusUpdate;

  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdatePayload[]>([]);
  const maxUpdates = 50;

  const emitStatusUpdate = useCallback(
    (payload: Omit<StatusUpdatePayload, "timestamp" | "source">) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("status_update", {
          ...payload,
          organizationId: organizationId || payload.organizationId,
        });
      }
    },
    [organizationId]
  );

  useEffect(() => {
    if (!WS_URL) return;

    const socket = io(WS_URL, {
      path: WS_PATH,
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));

    socket.on("status_update", (data: StatusUpdatePayload) => {
      setStatusUpdates((prev) => [data, ...prev].slice(0, maxUpdates));
      onStatusUpdateRef.current?.(data);
    });

    socketRef.current = socket;
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  return { connected, statusUpdates, emitStatusUpdate };
}
