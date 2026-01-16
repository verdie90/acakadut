import { NextRequest } from "next/server";
import { waChatManager } from "@/lib/whatsapp/chat-manager";
import { waPuppeteerManager } from "@/lib/whatsapp/puppeteer-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSE endpoint for real-time chat updates
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new Response("Session ID is required", { status: 400 });
  }

  // Check if session exists
  const session = waPuppeteerManager.getSession(sessionId);
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial ready status
      const isReady = waChatManager.isReady(sessionId);
      controller.enqueue(
        encoder.encode(`event: ready\ndata: ${JSON.stringify({ ready: isReady })}\n\n`)
      );

      // Handle chat session ready
      const handleChatReady = (data: { sessionId: string }) => {
        if (data.sessionId === sessionId) {
          try {
            controller.enqueue(
              encoder.encode(`event: chat_ready\ndata: ${JSON.stringify({ sessionId })}\n\n`)
            );
          } catch {
            // Stream closed
          }
        }
      };
      waChatManager.on("chat_session_ready", handleChatReady);

      // Handle chats loaded
      const handleChatsLoaded = (data: { sessionId: string; chats: unknown[] }) => {
        if (data.sessionId === sessionId) {
          try {
            controller.enqueue(
              encoder.encode(`event: chats\ndata: ${JSON.stringify(data.chats)}\n\n`)
            );
          } catch {
            // Stream closed
          }
        }
      };
      waChatManager.on("chats_loaded", handleChatsLoaded);

      // Handle unread updates
      const handleUnread = (data: { sessionId: string; chatId: string; name: string; count: number }) => {
        if (data.sessionId === sessionId) {
          try {
            controller.enqueue(
              encoder.encode(`event: unread\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            // Stream closed
          }
        }
      };
      waChatManager.on("unread_update", handleUnread);

      // Handle message sent
      const handleMessageSent = (data: { sessionId: string; message: string; phoneNumber?: string }) => {
        if (data.sessionId === sessionId) {
          try {
            controller.enqueue(
              encoder.encode(`event: message_sent\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            // Stream closed
          }
        }
      };
      waChatManager.on("message_sent", handleMessageSent);

      // Handle queue status
      const handleQueueSent = (data: { sessionId: string }) => {
        if (data.sessionId === sessionId) {
          try {
            controller.enqueue(
              encoder.encode(`event: queue_sent\ndata: ${JSON.stringify({ status: "sent" })}\n\n`)
            );
          } catch {
            // Stream closed
          }
        }
      };
      waChatManager.on("queue_message_sent", handleQueueSent);

      const handleQueueFailed = (data: { sessionId: string; error?: string }) => {
        if (data.sessionId === sessionId) {
          try {
            controller.enqueue(
              encoder.encode(`event: queue_failed\ndata: ${JSON.stringify({ error: data.error })}\n\n`)
            );
          } catch {
            // Stream closed
          }
        }
      };
      waChatManager.on("queue_message_failed", handleQueueFailed);

      // Ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        waChatManager.off("chat_session_ready", handleChatReady);
        waChatManager.off("chats_loaded", handleChatsLoaded);
        waChatManager.off("unread_update", handleUnread);
        waChatManager.off("message_sent", handleMessageSent);
        waChatManager.off("queue_message_sent", handleQueueSent);
        waChatManager.off("queue_message_failed", handleQueueFailed);
        clearInterval(pingInterval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
