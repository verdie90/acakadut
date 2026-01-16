import { useState, useEffect, useCallback, useRef } from "react";

export type SessionStatus = 
  | "initializing" 
  | "qr_pending" 
  | "authenticated" 
  | "ready" 
  | "disconnected" 
  | "failed"
  | "idle";

interface WhatsAppSessionData {
  status: SessionStatus;
  qrCode: string | null;
  phoneNumber: string | null;
  error: string | null;
  isConnected: boolean;
}

interface UseWhatsAppSessionOptions {
  deviceId: string | null;
  enabled?: boolean;
  onReady?: (phoneNumber: string) => void;
  onError?: (error: string) => void;
  onQR?: (qr: string) => void;
}

export function useWhatsAppSession({
  deviceId,
  enabled = true,
  onReady,
  onError,
  onQR,
}: UseWhatsAppSessionOptions) {
  const [data, setData] = useState<WhatsAppSessionData>({
    status: "idle",
    qrCode: null,
    phoneNumber: null,
    error: null,
    isConnected: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Connect to SSE
  const connect = useCallback(() => {
    if (!deviceId || !enabled) return;

    cleanup();
    setIsLoading(true);

    const eventSource = new EventSource(`/api/whatsapp/session/events?deviceId=${deviceId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setData(prev => ({ ...prev, isConnected: true }));
      setIsLoading(false);
    };

    eventSource.onerror = () => {
      setData(prev => ({ ...prev, isConnected: false }));
      setIsLoading(false);
      
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    // Handle QR code event
    eventSource.addEventListener("qr", (event) => {
      try {
        const eventData = JSON.parse(event.data);
        setData(prev => ({ 
          ...prev, 
          qrCode: eventData.qr, 
          status: "qr_pending" 
        }));
        onQR?.(eventData.qr);
      } catch (e) {
        console.error("Error parsing QR event:", e);
      }
    });

    // Handle status event
    eventSource.addEventListener("status", (event) => {
      try {
        const eventData = JSON.parse(event.data);
        setData(prev => ({
          ...prev,
          status: eventData.status,
          phoneNumber: eventData.phoneNumber || prev.phoneNumber,
          error: eventData.error || null,
        }));

        if (eventData.status === "ready" && eventData.phoneNumber) {
          onReady?.(eventData.phoneNumber);
        }

        if (eventData.status === "failed" && eventData.error) {
          onError?.(eventData.error);
        }
      } catch (e) {
        console.error("Error parsing status event:", e);
      }
    });

    // Handle connected event
    eventSource.addEventListener("connected", () => {
      setData(prev => ({ ...prev, isConnected: true }));
    });

    // Handle ping (keep-alive)
    eventSource.addEventListener("ping", () => {
      // Just acknowledge, no action needed
    });
  }, [deviceId, enabled, cleanup, onReady, onError, onQR]);

  // Initialize session
  const initializeSession = useCallback(async (userId: string) => {
    if (!deviceId) return { success: false, error: "No device ID" };

    setIsLoading(true);
    try {
      const response = await fetch("/api/whatsapp/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, userId }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to initialize session");
      }

      setData(prev => ({
        ...prev,
        status: result.data.status,
        qrCode: result.data.qrCode || null,
      }));

      // Connect to SSE for real-time updates
      connect();

      return { success: true, data: result.data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setData(prev => ({ ...prev, status: "failed", error: errorMessage }));
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, connect, onError]);

  // Disconnect session
  const disconnectSession = useCallback(async (logout = false) => {
    if (!deviceId) return { success: false, error: "No device ID" };

    cleanup();

    try {
      const response = await fetch(
        `/api/whatsapp/session?deviceId=${deviceId}&logout=${logout}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to disconnect");
      }

      setData({
        status: "disconnected",
        qrCode: null,
        phoneNumber: null,
        error: null,
        isConnected: false,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  }, [deviceId, cleanup]);

  // Cleanup on unmount or device change
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup, deviceId]);

  // Auto-connect when enabled
  useEffect(() => {
    if (enabled && deviceId) {
      connect();
    } else {
      cleanup();
    }
  }, [enabled, deviceId, connect, cleanup]);

  return {
    ...data,
    isLoading,
    initializeSession,
    disconnectSession,
    reconnect: connect,
  };
}
