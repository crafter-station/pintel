import { asc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
	drawings,
	gameSessions,
	guesses,
	playerScores,
	roundResults,
} from "@/db/schema";

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

		const [sessionRounds, sessionDrawings, sessionGuesses] = await Promise.all([
			db
				.select()
				.from(roundResults)
				.where(eq(roundResults.sessionId, id))
				.orderBy(asc(roundResults.roundNumber)),
			db.select().from(drawings).where(eq(drawings.sessionId, id)),
			db.select().from(guesses).where(eq(guesses.sessionId, id)),
		]);

		let playerName: string | null = null;
		if (session.clerkUserId) {
			const [player] = await db
				.select()
				.from(playerScores)
				.where(eq(playerScores.clerkUserId, session.clerkUserId))
				.limit(1);
			playerName = player?.username || null;
		} else if (session.anonId) {
			const [player] = await db
				.select()
				.from(playerScores)
				.where(eq(playerScores.anonId, session.anonId))
				.limit(1);
			playerName = player?.username || null;
		}

		const rounds = sessionRounds.map((round) => {
			const roundGuesses = sessionGuesses.filter((g) => g.roundId === round.id);

			const llmDrawing = sessionDrawings.find(
				(d) => round.drawerType === "llm" && d.modelId === round.drawerId,
			);

			return {
				id: round.id,
				roundNumber: round.roundNumber,
				prompt: round.prompt,
				drawerType: round.drawerType,
				drawerId: round.drawerId,
				svg: llmDrawing?.svg || round.svg,
				chunks: llmDrawing?.chunks ? JSON.parse(llmDrawing.chunks) : null,
				guesses: roundGuesses.map((g) => ({
					id: g.id,
					modelId: g.modelId,
					guess: g.guess,
					isCorrect: g.isCorrect,
					isHuman: g.isHuman,
					semanticScore: g.semanticScore,
					finalScore: g.finalScore,
					generationTimeMs: g.generationTimeMs,
				})),
			};
		});

		const legacyGuesses =
			sessionRounds.length === 0
				? sessionGuesses.map((g) => ({
						id: g.id,
						modelId: g.modelId,
						guess: g.guess,
						isCorrect: g.isCorrect,
						generationTimeMs: g.generationTimeMs,
					}))
				: [];

		return NextResponse.json({
			id: session.id,
			mode: session.mode,
			prompt: session.prompt,
			totalCost: session.totalCost || 0,
			totalTokens: session.totalTokens || 0,
			totalTimeMs: session.totalTimeMs,
			createdAt: session.createdAt.toISOString(),
			playerName,
			rounds,
			drawings: sessionDrawings.map((d) => ({
				id: d.id,
				modelId: d.modelId,
				svg: d.svg,
				generationTimeMs: d.generationTimeMs,
				cost: d.cost,
				isWinner: d.isWinner,
				chunks: d.chunks ? JSON.parse(d.chunks) : null,
			})),
			guesses: legacyGuesses,
		});
	} catch (error) {
		console.error("Error fetching session:", error);
		return NextResponse.json(
			{ error: "Failed to fetch session" },
			{ status: 500 },
		);
	}
}
