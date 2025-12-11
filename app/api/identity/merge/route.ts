import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { gameSessions } from "@/db/schema";
import { getCurrentIdentity } from "@/lib/identity";

export async function POST(request: NextRequest) {
	try {
		const { userId: clerkUserId } = await auth();

		if (!clerkUserId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const identity = await getCurrentIdentity(request);
		const anonId = identity.anonId;

		if (!anonId) {
			return NextResponse.json(
				{ error: "No anonymous ID found" },
				{ status: 400 },
			);
		}

		const result = await db
			.update(gameSessions)
			.set({
				clerkUserId,
				anonId: null,
			})
			.where(
				and(eq(gameSessions.anonId, anonId), isNull(gameSessions.clerkUserId)),
			)
			.returning({ id: gameSessions.id });

		return NextResponse.json({
			success: true,
			mergedCount: result.length,
		});
	} catch (error) {
		console.error("Error merging sessions:", error);
		return NextResponse.json(
			{ error: "Failed to merge sessions" },
			{ status: 500 },
		);
	}
}
