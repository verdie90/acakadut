import { NextRequest, NextResponse } from "next/server";
import { waChatManager } from "@/lib/whatsapp/chat-manager";
import { waPuppeteerManager } from "@/lib/whatsapp/puppeteer-manager";

/**
 * GET: Get messages from current open chat
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const chatName = searchParams.get("chatName");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Check if session is connected
    const session = waPuppeteerManager.getSession(sessionId);
    if (!session || session.status !== "connected") {
      return NextResponse.json(
        { success: false, error: "Session not connected" },
        { status: 400 }
      );
    }

    // Open specific chat if chatName provided
    if (chatName) {
      const opened = await waChatManager.openChat(sessionId, chatName);
      if (!opened) {
        return NextResponse.json(
          { success: false, error: "Failed to open chat" },
          { status: 400 }
        );
      }
    }

    // Get messages
    const messages = await waChatManager.getMessages(sessionId, limit);

    return NextResponse.json({
      success: true,
      data: {
        messages,
        count: messages.length,
      },
    });
  } catch (error) {
    console.error("Error getting messages:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get messages" },
      { status: 500 }
    );
  }
}

/**
 * POST: Send a message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, message, phoneNumber, chatName } = body;

    if (!sessionId || !message) {
      return NextResponse.json(
        { success: false, error: "Session ID and message are required" },
        { status: 400 }
      );
    }

    // Check if session is connected
    const session = waPuppeteerManager.getSession(sessionId);
    if (!session || session.status !== "connected") {
      return NextResponse.json(
        { success: false, error: "Session not connected" },
        { status: 400 }
      );
    }

    let result;

    if (phoneNumber) {
      // Send to specific phone number
      result = await waChatManager.sendMessageToNumber(sessionId, phoneNumber, message);
    } else if (chatName) {
      // Open chat first then send
      const opened = await waChatManager.openChat(sessionId, chatName);
      if (!opened) {
        return NextResponse.json(
          { success: false, error: "Failed to open chat" },
          { status: 400 }
        );
      }
      result = await waChatManager.sendMessage(sessionId, message);
    } else {
      // Send to currently open chat
      result = await waChatManager.sendMessage(sessionId, message);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}
