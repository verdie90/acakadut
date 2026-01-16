import { NextRequest, NextResponse } from "next/server";
import { waPuppeteerManager } from "@/lib/whatsapp/puppeteer-manager";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

// Generate unique session ID
function generateSessionId(): string {
  return `wa_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

/**
 * POST: Create a new WhatsApp Unofficial session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, slotId, name } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Generate session ID
    const sessionId = generateSessionId();
    const deviceName = name || `Device ${sessionId.slice(-6)}`;

    // Create session in Firestore
    await adminDb.collection("wa_unofficial_sessions").doc(sessionId).set({
      id: sessionId,
      userId,
      slotId: slotId || null,
      name: deviceName,
      status: "initializing",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Initialize Puppeteer session with device name
    const session = await waPuppeteerManager.createSession(sessionId, userId, deviceName);

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        deviceName,
        status: session.status,
      },
    });
  } catch (error) {
    console.error("Error creating WA unofficial session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create session" },
      { status: 500 }
    );
  }
}

/**
 * GET: Get session status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId");

    if (sessionId) {
      // Get specific session
      const session = waPuppeteerManager.getSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { success: false, error: "Session not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: session,
      });
    }

    if (userId) {
      // Get all sessions for user
      const sessions = waPuppeteerManager.getUserSessions(userId);
      return NextResponse.json({
        success: true,
        data: sessions,
      });
    }

    return NextResponse.json(
      { success: false, error: "Session ID or User ID required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error getting WA unofficial session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get session" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Destroy a session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Destroy Puppeteer session
    await waPuppeteerManager.destroySession(sessionId);

    // Update Firestore
    await adminDb.collection("wa_unofficial_sessions").doc(sessionId).update({
      status: "disconnected",
      disconnectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Session destroyed",
    });
  } catch (error) {
    console.error("Error destroying WA unofficial session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to destroy session" },
      { status: 500 }
    );
  }
}
