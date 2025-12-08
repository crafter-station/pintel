import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { gameSessions } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

async function verifyWebhook(body: string, headerPayload: Headers) {
  if (!WEBHOOK_SECRET) {
    console.warn("CLERK_WEBHOOK_SECRET not set, skipping webhook verification");
    return JSON.parse(body);
  }

  try {
    const { Webhook } = await import("svix");
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      throw new Error("Missing svix headers");
    }

    const wh = new Webhook(WEBHOOK_SECRET);
    return wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (error) {
    console.error("Webhook verification failed:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const headerPayload = await headers();
    const payload = await request.json();
    const body = JSON.stringify(payload);

    let evt: any;
    try {
      evt = await verifyWebhook(body, headerPayload);
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    const eventType = evt.type;

    if (eventType === "user.created") {
      const { id: clerkUserId, public_metadata } = evt.data;

      const anonId = public_metadata?.anonId as string | undefined;

      if (anonId) {
        try {
          await db
            .update(gameSessions)
            .set({
              clerkUserId,
              anonId: null,
            })
            .where(
              and(
                eq(gameSessions.anonId, anonId),
                isNull(gameSessions.clerkUserId)
              )
            );

          return NextResponse.json({ success: true });
        } catch (error) {
          console.error("Error merging sessions:", error);
          return NextResponse.json(
            { error: "Failed to merge sessions" },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
