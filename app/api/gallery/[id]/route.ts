import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drawings, gameSessions, guesses } from "@/db/schema";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const [session] = await db
			.select()
			.from(gameSessions)
			.where(eq(gameSessions.id, id))
			.limit(1);

		if (!session) {
			return NextResponse.json({ error: "Session not found" }, { status: 404 });
		}

		const [sessionDrawings, sessionGuesses] = await Promise.all([
			db.select().from(drawings).where(eq(drawings.sessionId, id)),
			db.select().from(guesses).where(eq(guesses.sessionId, id)),
		]);

		return NextResponse.json({
			id: session.id,
			mode: session.mode,
			prompt: session.prompt,
			totalCost: session.totalCost || 0,
			totalTokens: session.totalTokens || 0,
			totalTimeMs: session.totalTimeMs,
			createdAt: session.createdAt.toISOString(),
			drawings: sessionDrawings.map((d) => ({
				id: d.id,
				modelId: d.modelId,
				svg: d.svg,
				generationTimeMs: d.generationTimeMs,
				cost: d.cost,
				isWinner: d.isWinner,
				chunks: d.chunks ? JSON.parse(d.chunks) : null,
			})),
			guesses: sessionGuesses.map((g) => ({
				id: g.id,
				modelId: g.modelId,
				guess: g.guess,
				isCorrect: g.isCorrect,
				generationTimeMs: g.generationTimeMs,
			})),
		});
	} catch (error) {
		console.error("Error fetching session:", error);
		return NextResponse.json(
			{ error: "Failed to fetch session" },
			{ status: 500 },
		);
	}
}
