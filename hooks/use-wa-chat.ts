"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface WAChat {
  id: string;
  name: string;
  phoneNumber?: string;
  profilePic?: string;
  isGroup: boolean;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

interface WAMessage {
  id: string;
  body: string;
  isFromMe: boolean;
  timestamp: string;
  fromName: string;
  hasMedia: boolean;
}

interface UnreadUpdate {
  chatId: string;
  name: string;
  count: number;
}

interface UseWAChatResult {
  isReady: boolean;
  chats: WAChat[];
  messages: WAMessage[];
  currentChat: string | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  unreadUpdates: UnreadUpdate[];
  loadChats: () => Promise<void>;
  openChat: (chatName: string) => Promise<void>;
  sendMessage: (message: string, phoneNumber?: string) => Promise<boolean>;
  refreshMessages: () => Promise<void>;
}

export function useWAChat(sessionId: string | null): UseWAChatResult {
  const [isReady, setIsReady] = useState(false);
  const [chats, setChats] = useState<WAChat[]>([]);
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadUpdates, setUnreadUpdates] = useState<UnreadUpdate[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE for real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(
      `/api/platforms/wa-unofficial/chat/events?sessionId=${sessionId}`
    );
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("ready", (event) => {
      const data = JSON.parse(event.data);
      setIsReady(data.ready);
    });

    eventSource.addEventListener("chat_ready", () => {
      setIsReady(true);
    });

    eventSource.addEventListener("chats", (event) => {
      const data = JSON.parse(event.data);
      setChats(data);
    });

    eventSource.addEventListener("unread", (event) => {
      const data = JSON.parse(event.data);
      setUnreadUpdates((prev) => {
        // Update or add unread notification
        const existing = prev.findIndex((u) => u.chatId === data.chatId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data];
      });

      // Update chat list with new unread count
      setChats((prev) =>
        prev.map((chat) =>
          chat.name === data.name ? { ...chat, unreadCount: data.count } : chat
        )
      );
    });

    eventSource.addEventListener("message_sent", () => {
      // Refresh messages after sending
      setIsSending(false);
    });

    eventSource.onerror = () => {
      setError("Connection lost");
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId]);

  // Load chat list
  const loadChats = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/platforms/wa-unofficial/chat?sessionId=${sessionId}&refresh=true`
      );
      const result = await response.json();

      if (result.success) {
        setChats(result.data.chats);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chats");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Open a chat and load messages
  const openChat = useCallback(
    async (chatName: string) => {
      if (!sessionId) return;

      setIsLoading(true);
      setError(null);
      setCurrentChat(chatName);

      try {
        const response = await fetch(
          `/api/platforms/wa-unofficial/chat/messages?sessionId=${sessionId}&chatName=${encodeURIComponent(chatName)}&limit=50`
        );
        const result = await response.json();

        if (result.success) {
          setMessages(result.data.messages);
          // Clear unread for this chat
          setUnreadUpdates((prev) => prev.filter((u) => u.name !== chatName));
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to open chat");
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  // Refresh current chat messages
  const refreshMessages = useCallback(async () => {
    if (!sessionId || !currentChat) return;

    try {
      const response = await fetch(
        `/api/platforms/wa-unofficial/chat/messages?sessionId=${sessionId}&limit=50`
      );
      const result = await response.json();

      if (result.success) {
        setMessages(result.data.messages);
      }
    } catch (err) {
      console.error("Error refreshing messages:", err);
    }
  }, [sessionId, currentChat]);

  // Send a message
  const sendMessage = useCallback(
    async (message: string, phoneNumber?: string): Promise<boolean> => {
      if (!sessionId) return false;

      setIsSending(true);
      setError(null);

      try {
        const response = await fetch(
          "/api/platforms/wa-unofficial/chat/messages",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              message,
              phoneNumber,
              chatName: !phoneNumber ? currentChat : undefined,
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          // Add message to local state optimistically
          setMessages((prev) => [
            ...prev,
            {
              id: `msg_${Date.now()}`,
              body: message,
              isFromMe: true,
              timestamp: new Date().toLocaleTimeString(),
              fromName: "Me",
              hasMedia: false,
            },
          ]);
          
          // Refresh messages after a short delay
          setTimeout(() => refreshMessages(), 2000);
          return true;
        } else {
          setError(result.error);
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [sessionId, currentChat, refreshMessages]
  );

  return {
    isReady,
    chats,
    messages,
    currentChat,
    isLoading,
    isSending,
    error,
    unreadUpdates,
    loadChats,
    openChat,
    sendMessage,
    refreshMessages,
  };
}
