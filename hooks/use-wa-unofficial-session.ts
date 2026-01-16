"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SessionInfo {
  sessionId?: string;
  deviceName?: string;
  phoneNumber?: string;
  pushName?: string;
  profilePic?: string;
  platform?: string;
  connectedAt?: string;
  lastSyncAt?: string;
}

interface UseWAUnofficialSessionResult {
  status: string;
  qrCode: string | null;
  error: string | null;
  isLoading: boolean;
  sessionInfo: SessionInfo | null;
  initializeSession: () => Promise<void>;
  destroySession: () => Promise<void>;
}

export function useWAUnofficialSession(
  userId: string | undefined,
  slotId?: string,
  deviceName?: string
): UseWAUnofficialSessionResult {
  const [status, setStatus] = useState<string>("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Initialize session
  const initializeSession = useCallback(async () => {
    if (!userId) {
      setError("User ID is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setQrCode(null);
    setStatus("initializing");
    setSessionInfo(null);

    try {
      // Create session via API
      const response = await fetch("/api/platforms/wa-unofficial/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          slotId,
          name: deviceName,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create session");
      }

      const newSessionId = result.data.sessionId;
      setSessionId(newSessionId);
      
      // Set initial session info with device name
      setSessionInfo({
        sessionId: newSessionId,
        deviceName: result.data.deviceName || deviceName,
      });

      // Connect to SSE for real-time updates
      const eventSource = new EventSource(
        `/api/platforms/wa-unofficial/session/events?sessionId=${newSessionId}`
      );
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsLoading(false);
      };

      eventSource.addEventListener("qr", (event) => {
        const data = JSON.parse(event.data);
        setQrCode(data.qr);
        setStatus("qr_ready");
      });

      eventSource.addEventListener("status", (event) => {
        const data = JSON.parse(event.data);
        setStatus(data.status);
      });

      eventSource.addEventListener("connected", (event) => {
        const data = JSON.parse(event.data);
        setStatus("connected");
        setQrCode(null);
        
        // Update session info with all available data
        setSessionInfo((prev) => ({
          ...prev,
          sessionId: data.sessionId || prev?.sessionId,
          deviceName: data.deviceName || prev?.deviceName,
          phoneNumber: data.phoneNumber,
          pushName: data.pushName,
          profilePic: data.profilePic,
          platform: data.platform,
          connectedAt: data.connectedAt || new Date().toISOString(),
          lastSyncAt: data.lastSyncAt || new Date().toISOString(),
        }));
        
        // Keep connection open for sync events
        // Don't close immediately to receive sync updates
      });

      eventSource.addEventListener("sync", (event) => {
        const data = JSON.parse(event.data);
        // Update session info with sync data
        setSessionInfo((prev) => ({
          ...prev,
          phoneNumber: data.phoneNumber || prev?.phoneNumber,
          pushName: data.pushName || prev?.pushName,
          lastSyncAt: data.lastSyncAt || new Date().toISOString(),
        }));
      });

      eventSource.addEventListener("disconnected", (event) => {
        const data = JSON.parse(event.data);
        setStatus("disconnected");
        setError(data.reason || "Session disconnected");
        eventSource.close();
      });

      eventSource.addEventListener("error", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          setError(data.error);
          setStatus("error");
        } catch {
          // Ignore parse errors
        }
      });

      eventSource.onerror = () => {
        setIsLoading(false);
        // Don't set error, SSE might reconnect
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setStatus("error");
      setIsLoading(false);
    }
  }, [userId, slotId, deviceName]);

  // Destroy session
  const destroySession = useCallback(async () => {
    if (!sessionId) return;

    try {
      // Close SSE
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Call API to destroy session
      await fetch(`/api/platforms/wa-unofficial/session?sessionId=${sessionId}`, {
        method: "DELETE",
      });

      setSessionId(null);
      setStatus("idle");
      setQrCode(null);
      setSessionInfo(null);
    } catch (err) {
      console.error("Error destroying session:", err);
    }
  }, [sessionId]);

  return {
    status,
    qrCode,
    error,
    isLoading,
    sessionInfo,
    initializeSession,
    destroySession,
  };
}
