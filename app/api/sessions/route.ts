import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { gameSessions } from "@/db/schema";
import { getCurrentIdentity } from "@/lib/identity";

const CreateSessionSchema = z.object({
	mode: z.enum(["pictionary", "human_judge", "model_guess", "ai_duel"]),
	prompt: z.string(),
	totalRounds: z.number(),
	participants: z.array(z.string()),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const data = CreateSessionSchema.parse(body);
		const identity = await getCurrentIdentity(request);

		const [session] = await db
			.insert(gameSessions)
			.values({
				mode: data.mode,
				prompt: data.prompt,
				totalRounds: data.totalRounds,
				currentRound: 1,
				anonId: identity.anonId || null,
				clerkUserId: identity.clerkUserId || null,
			})
			.returning();

		if (!session) {
			throw new Error("Failed to create session");
		}

		return NextResponse.json({ sessionId: session.id }, { status: 201 });
	} catch (error) {
		console.error("Error creating session:", error);
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid request data", details: error.issues },
				{ status: 400 },
			);
		}
		return NextResponse.json(
			{ error: "Failed to create session" },
			{ status: 500 },
		);
	}
}
