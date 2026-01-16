import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

// POST - Receive webhook from WhatsApp provider
export async function POST(request: NextRequest) {
  try {
    const { db } = getFirebaseAdmin();
    if (!db) {
      throw new Error("Firebase Admin not initialized");
    }
    const body = await request.json();
    
    console.log("WhatsApp Webhook received:", JSON.stringify(body, null, 2));

    // Parse the webhook payload based on common WhatsApp provider formats
    // This supports various providers like Twilio, Vonage, MessageBird, etc.
    
    let messageData: {
      from: string;
      to: string;
      message: string;
      messageType: string;
      status: string;
      rawData: Record<string, unknown>;
    };

    // Twilio format
    if (body.From && body.To && (body.Body || body.MediaUrl0)) {
      messageData = {
        from: body.From,
        to: body.To,
        message: body.Body || "[Media Message]",
        messageType: body.MediaUrl0 ? "media" : "text",
        status: "received",
        rawData: body,
      };
    }
    // Vonage/Nexmo format
    else if (body.msisdn && body.to && body.text) {
      messageData = {
        from: body.msisdn,
        to: body.to,
        message: body.text,
        messageType: body.type || "text",
        status: "received",
        rawData: body,
      };
    }
    // MessageBird format
    else if (body.originator && body.recipient && body.body) {
      messageData = {
        from: body.originator,
        to: body.recipient,
        message: body.body,
        messageType: body.type || "text",
        status: "received",
        rawData: body,
      };
    }
    // Generic format - try to extract what we can
    else {
      messageData = {
        from: body.from || body.sender || body.phone || "unknown",
        to: body.to || body.recipient || "unknown",
        message: body.message || body.text || body.body || body.content || JSON.stringify(body),
        messageType: body.type || body.messageType || "text",
        status: "received",
        rawData: body,
      };
    }

    // Save to Firestore
    await db.collection("whatsapp_messages").add({
      ...messageData,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    });

    console.log("WhatsApp message saved successfully");

    return NextResponse.json(
      { success: true, message: "Webhook received" },
      { status: 200 }
    );
  } catch (error) {
    console.error("WhatsApp Webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Health check for the webhook endpoint
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "WhatsApp Webhook",
      timestamp: new Date().toISOString(),
      message: "Webhook endpoint is active. Send POST requests with WhatsApp messages.",
    },
    { status: 200 }
  );
}
