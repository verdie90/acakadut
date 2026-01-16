import { NextRequest, NextResponse } from "next/server";
import { waChatManager } from "@/lib/whatsapp/chat-manager";
import { waPuppeteerManager } from "@/lib/whatsapp/puppeteer-manager";

/**
 * GET: Get chat list for a session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const refresh = searchParams.get("refresh") === "true";

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

    // Get or refresh chat list
    let chats = waChatManager.getChats(sessionId);
    
    if (refresh || chats.length === 0) {
      chats = await waChatManager.loadChatList(sessionId);
    }

    return NextResponse.json({
      success: true,
      data: {
        chats,
        count: chats.length,
      },
    });
  } catch (error) {
    console.error("Error getting chats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get chats" },
      { status: 500 }
    );
  }
}
