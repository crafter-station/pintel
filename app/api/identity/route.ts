import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCurrentIdentity } from "@/lib/identity";
import { z } from "zod";

const SetAnonIdSchema = z.object({
  anonId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const identity = await getCurrentIdentity(request);
    return NextResponse.json(identity);
  } catch (error) {
    console.error("Error fetching identity:", error);
    return NextResponse.json(
      { error: "Failed to fetch identity" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anonId } = SetAnonIdSchema.parse(body);

    const { userId: clerkUserId } = await auth();

    const response = NextResponse.json({
      anonId,
      clerkUserId: clerkUserId || null,
      isAuthenticated: !!clerkUserId,
    });

    response.cookies.set("anon_id", anonId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error setting anonymous ID:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to set anonymous ID" },
      { status: 500 }
    );
  }
}
