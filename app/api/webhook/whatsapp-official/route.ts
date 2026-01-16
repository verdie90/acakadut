import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

// Verify Token for Meta Webhook verification
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "your-verify-token";

// GET - Webhook Verification (required by Meta)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("WhatsApp Official Webhook Verification:", { mode, token, challenge });

  // Verify the webhook
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  // If no verification params, return health check
  if (!mode && !token && !challenge) {
    return NextResponse.json(
      {
        status: "ok",
        service: "WhatsApp Business API Webhook",
        timestamp: new Date().toISOString(),
        message: "Webhook endpoint is active. Configure this URL in Meta Developer Console.",
      },
      { status: 200 }
    );
  }

  console.log("Webhook verification failed");
  return NextResponse.json(
    { error: "Verification failed" },
    { status: 403 }
  );
}

// POST - Receive webhook events from Meta
export async function POST(request: NextRequest) {
  try {
    const { db } = getFirebaseAdmin();
    if (!db) {
      throw new Error("Firebase Admin not initialized");
    }
    const body = await request.json();
    
    console.log("WhatsApp Official Webhook received:", JSON.stringify(body, null, 2));

    // Log the webhook event
    await db.collection("whatsapp_official_logs").add({
      event: body.object || "unknown",
      status: "success",
      timestamp: Timestamp.now(),
      payload: body,
    });

    // Process the webhook based on Meta's WhatsApp Business API format
    if (body.object === "whatsapp_business_account") {
      const entries = body.entry || [];
      
      for (const entry of entries) {
        const changes = entry.changes || [];
        
        for (const change of changes) {
          const value = change.value;
          
          if (!value) continue;

          // Handle incoming messages
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              const contact = value.contacts?.[0];
              
              // Determine message content based on type
              let messageContent = "";
              const messageType = message.type || "text";
              
              switch (messageType) {
                case "text":
                  messageContent = message.text?.body || "";
                  break;
                case "image":
                  messageContent = "[Image]";
                  break;
                case "video":
                  messageContent = "[Video]";
                  break;
                case "audio":
                  messageContent = "[Audio]";
                  break;
                case "document":
                  messageContent = `[Document: ${message.document?.filename || "file"}]`;
                  break;
                case "sticker":
                  messageContent = "[Sticker]";
                  break;
                case "location":
                  messageContent = `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`;
                  break;
                case "contacts":
                  messageContent = "[Contact Card]";
                  break;
                case "interactive":
                  messageContent = message.interactive?.button_reply?.title || 
                                   message.interactive?.list_reply?.title || 
                                   "[Interactive Message]";
                  break;
                case "button":
                  messageContent = message.button?.text || "[Button Response]";
                  break;
                default:
                  messageContent = `[${messageType}]`;
              }

              // Save message to Firestore
              await db.collection("whatsapp_official_messages").add({
                from: message.from,
                to: value.metadata?.display_phone_number || "",
                waId: contact?.wa_id || message.from,
                profileName: contact?.profile?.name || "",
                message: messageContent,
                messageType: messageType,
                messageId: message.id,
                status: "received",
                timestamp: Timestamp.fromMillis(parseInt(message.timestamp) * 1000),
                rawData: message,
                createdAt: Timestamp.now(),
              });

              console.log(`Message saved from ${message.from}: ${messageContent}`);
            }
          }

          // Handle message status updates
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              console.log(`Status update for ${status.id}: ${status.status}`);
              
              // You can update the message status in Firestore here
              // Find the message by messageId and update its status
            }
          }
        }
      }
    }

    // Meta requires a 200 response
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("WhatsApp Official Webhook error:", error);
    
    // Log the error
    try {
      const { db } = getFirebaseAdmin();
      if (db) {
        await db.collection("whatsapp_official_logs").add({
          event: "error",
          status: "error",
          timestamp: Timestamp.now(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
