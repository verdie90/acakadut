import { NextRequest } from "next/server";
import { waPuppeteerManager } from "@/lib/whatsapp/puppeteer-manager";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Update Firestore session status
 */
async function updateSessionInFirestore(
  sessionId: string,
  data: Record<string, unknown>
) {
  try {
    await adminDb.collection("wa_unofficial_sessions").doc(sessionId).update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`[SSE] Failed to update Firestore for ${sessionId}:`, error);
  }
}

/**
 * SSE endpoint for real-time QR code and status updates
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new Response("Session ID is required", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial status
      const session = waPuppeteerManager.getSession(sessionId);
      if (session) {
        controller.enqueue(
          encoder.encode(`event: status\ndata: ${JSON.stringify({ status: session.status })}\n\n`)
        );

        // If QR is available, send it
        if (session.qrCode) {
          controller.enqueue(
            encoder.encode(`event: qr\ndata: ${JSON.stringify({ qr: session.qrCode })}\n\n`)
          );
        }
      }

      // Subscribe to QR updates
      const unsubQR = waPuppeteerManager.subscribeToQR(sessionId, (qr) => {
        try {
          controller.enqueue(
            encoder.encode(`event: qr\ndata: ${JSON.stringify({ qr })}\n\n`)
          );
          
          // Update status in Firestore
          updateSessionInFirestore(sessionId, { status: "qr_ready" });
        } catch {
          // Stream closed
        }
      });

      // Subscribe to status updates
      const unsubStatus = waPuppeteerManager.subscribeToStatus(sessionId, (status) => {
        try {
          controller.enqueue(
            encoder.encode(`event: status\ndata: ${JSON.stringify({ status })}\n\n`)
          );

          // Update Firestore based on status
          if (status === "connected") {
            // Get full session data for Firestore update
            const fullSession = waPuppeteerManager.getSession(sessionId);
            updateSessionInFirestore(sessionId, {
              status: "connected",
              phoneNumber: fullSession?.phoneNumber || null,
              pushName: fullSession?.pushName || null,
              deviceName: fullSession?.deviceName || null,
              profilePic: fullSession?.profilePic || null,
              platform: fullSession?.platform || null,
              connectedAt: FieldValue.serverTimestamp(),
              lastSyncAt: FieldValue.serverTimestamp(),
            });

            // Send connected event to client with full session info
            setTimeout(() => {
              try {
                const sessionInfo = waPuppeteerManager.getSession(sessionId);
                controller.enqueue(
                  encoder.encode(
                    `event: connected\ndata: ${JSON.stringify({
                      sessionId,
                      deviceName: sessionInfo?.deviceName,
                      phoneNumber: sessionInfo?.phoneNumber,
                      pushName: sessionInfo?.pushName,
                      profilePic: sessionInfo?.profilePic,
                      platform: sessionInfo?.platform,
                      connectedAt: sessionInfo?.connectedAt,
                      lastSyncAt: sessionInfo?.lastSyncAt,
                    })}\n\n`
                  )
                );
              } catch {
                // Ignore
              }
            }, 500);
          } else if (status === "disconnected" || status === "error") {
            updateSessionInFirestore(sessionId, { status });
          }
        } catch {
          // Stream closed
        }
      });

      // Handle sync events (periodic updates)
      const handleSync = (data: { sessionId: string; session: Record<string, unknown> }) => {
        if (data.sessionId === sessionId) {
          try {
            controller.enqueue(
              encoder.encode(`event: sync\ndata: ${JSON.stringify(data.session)}\n\n`)
            );
            
            // Update Firestore with sync data
            updateSessionInFirestore(sessionId, {
              lastSyncAt: FieldValue.serverTimestamp(),
              phoneNumber: data.session.phoneNumber || null,
              pushName: data.session.pushName || null,
            });
          } catch {
            // Stream closed
          }
        }
      };
      waPuppeteerManager.on("sync", handleSync);

      // Handle connection closed / disconnected
      const handleDisconnect = (data: { sessionId: string; reason?: string }) => {
        if (data.sessionId === sessionId) {
          try {
            controller.enqueue(
              encoder.encode(
                `event: disconnected\ndata: ${JSON.stringify({ reason: data.reason || "Session disconnected" })}\n\n`
              )
            );
            
            updateSessionInFirestore(sessionId, { 
              status: "disconnected",
              disconnectedAt: FieldValue.serverTimestamp(),
            });
          } catch {
            // Stream closed
          }
        }
      };
      waPuppeteerManager.on("disconnected", handleDisconnect);

      // Handle errors
      const handleError = (data: { sessionId: string; error: string }) => {
        if (data.sessionId === sessionId) {
          try {
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: data.error })}\n\n`)
            );
            
            updateSessionInFirestore(sessionId, { 
              status: "error",
              error: data.error,
            });
          } catch {
            // Stream closed
          }
        }
      };
      waPuppeteerManager.on("error", handleError);

      // Ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        unsubQR();
        unsubStatus();
        waPuppeteerManager.off("disconnected", handleDisconnect);
        waPuppeteerManager.off("error", handleError);
        waPuppeteerManager.off("sync", handleSync);
        clearInterval(pingInterval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
