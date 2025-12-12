import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
	drawings,
	guesses,
	modelScores,
	playerScores,
	roundResults,
} from "@/db/schema";
import { getCurrentIdentity } from "@/lib/identity";

const MAX_SCORE_PER_GUESSER = 180;

const SaveRoundSchema = z.object({
	sessionId: z.uuid(),
	roundNumber: z.number(),
	drawerId: z.string(),
	drawerType: z.enum(["human", "llm"]),
	prompt: z.string(),
	svg: z.string().optional(),
	imageDataUrl: z.string().optional(),
	guesserCount: z.number(),
	drawing: z
		.object({
			modelId: z.string(),
			svg: z.string(),
			generationTimeMs: z.number().optional(),
			cost: z.number().optional(),
			tokens: z.number().optional(),
		})
		.optional(),
	guesses: z.array(
		z.object({
			participantId: z.string(),
			participantType: z.enum(["human", "llm"]),
			guess: z.string(),
			semanticScore: z.number(),
			timeBonus: z.number(),
			finalScore: z.number(),
			timeMs: z.number(),
			cost: z.number().optional(),
			tokens: z.number().optional(),
		}),
	),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const data = SaveRoundSchema.parse(body);
		const identity = await getCurrentIdentity(request);

		const maxPossibleScore = data.guesserCount * MAX_SCORE_PER_GUESSER;
		const topScore = Math.max(...data.guesses.map((g) => g.finalScore), 0);

		const [round] = await db
			.insert(roundResults)
			.values({
				sessionId: data.sessionId,
				roundNumber: data.roundNumber,
				drawerId: data.drawerId,
				drawerType: data.drawerType,
				prompt: data.prompt,
				maxPossibleScore,
				topScore,
				svg: data.svg || data.imageDataUrl || data.drawing?.svg,
			})
			.returning();

		if (data.drawing && data.drawerType === "llm") {
			await db.insert(drawings).values({
				sessionId: data.sessionId,
				modelId: data.drawing.modelId,
				svg: data.drawing.svg,
				generationTimeMs: data.drawing.generationTimeMs,
				cost: data.drawing.cost,
				tokens: data.drawing.tokens,
			});
		}

		if (data.guesses.length > 0) {
			await db.insert(guesses).values(
				data.guesses.map((g) => ({
					sessionId: data.sessionId,
					roundId: round.id,
					modelId: g.participantId,
					guess: g.guess,
					isCorrect: g.semanticScore > 0.7,
					semanticScore: g.semanticScore,
					timeBonus: g.timeBonus,
					finalScore: g.finalScore,
					isHuman: g.participantType === "human",
					generationTimeMs: g.timeMs,
					cost: g.cost,
					tokens: g.tokens,
				})),
			);
		}

		for (const guess of data.guesses) {
			if (guess.participantType === "llm") {
				await db
					.insert(modelScores)
					.values({
						modelId: guess.participantId,
						guessingScore: guess.semanticScore,
						guessingRounds: 1,
						totalCost: guess.cost || 0,
						totalTokens: guess.tokens || 0,
					})
					.onConflictDoUpdate({
						target: modelScores.modelId,
						set: {
							guessingScore: sql`${modelScores.guessingScore} + ${guess.semanticScore}`,
							guessingRounds: sql`${modelScores.guessingRounds} + 1`,
							totalCost: sql`${modelScores.totalCost} + ${guess.cost || 0}`,
							totalTokens: sql`${modelScores.totalTokens} + ${guess.tokens || 0}`,
							updatedAt: new Date(),
						},
					});
			} else if (guess.participantType === "human") {
				if (identity.clerkUserId) {
					await db
						.insert(playerScores)
						.values({
							clerkUserId: identity.clerkUserId,
							anonId: null,
							username: identity.username,
							totalScore: guess.finalScore,
							guessingScore: guess.semanticScore,
							guessingRounds: 1,
							roundsPlayed: 1,
							bestRoundScore: guess.finalScore,
						})
						.onConflictDoUpdate({
							target: playerScores.clerkUserId,
							set: {
								username: identity.username,
								totalScore: sql`${playerScores.totalScore} + ${guess.finalScore}`,
								guessingScore: sql`${playerScores.guessingScore} + ${guess.semanticScore}`,
								guessingRounds: sql`${playerScores.guessingRounds} + 1`,
								roundsPlayed: sql`${playerScores.roundsPlayed} + 1`,
								bestRoundScore: sql`GREATEST(${playerScores.bestRoundScore}, ${guess.finalScore})`,
								updatedAt: new Date(),
							},
						});
				} else if (identity.anonId) {
					await db
						.insert(playerScores)
						.values({
							clerkUserId: null,
							anonId: identity.anonId,
							totalScore: guess.finalScore,
							guessingScore: guess.semanticScore,
							guessingRounds: 1,
							roundsPlayed: 1,
							bestRoundScore: guess.finalScore,
						})
						.onConflictDoUpdate({
							target: playerScores.anonId,
							set: {
								totalScore: sql`${playerScores.totalScore} + ${guess.finalScore}`,
								guessingScore: sql`${playerScores.guessingScore} + ${guess.semanticScore}`,
								guessingRounds: sql`${playerScores.guessingRounds} + 1`,
								roundsPlayed: sql`${playerScores.roundsPlayed} + 1`,
								bestRoundScore: sql`GREATEST(${playerScores.bestRoundScore}, ${guess.finalScore})`,
								updatedAt: new Date(),
							},
						});
				}
			}
		}

		if (data.drawerType === "llm" && data.drawing) {
			const drawerBonus = data.guesses.reduce((sum, g) => {
				const multiplier = g.participantType === "human" ? 1.5 : 1;
				return sum + (g.semanticScore > 0.7 ? 10 * multiplier : 0);
			}, 0);

			await db
				.insert(modelScores)
				.values({
					modelId: data.drawing.modelId,
					drawingScore: drawerBonus,
					drawingRounds: 1,
					totalCost: data.drawing.cost || 0,
					totalTokens: data.drawing.tokens || 0,
				})
				.onConflictDoUpdate({
					target: modelScores.modelId,
					set: {
						drawingScore: sql`${modelScores.drawingScore} + ${drawerBonus}`,
						drawingRounds: sql`${modelScores.drawingRounds} + 1`,
						totalCost: sql`${modelScores.totalCost} + ${data.drawing.cost || 0}`,
						totalTokens: sql`${modelScores.totalTokens} + ${data.drawing.tokens || 0}`,
						updatedAt: new Date(),
					},
				});
		} else if (data.drawerType === "human") {
			const drawerBonus = data.guesses.reduce((sum, g) => {
				return sum + (g.semanticScore > 0.7 ? 10 : 0);
			}, 0);

			if (identity.clerkUserId) {
				await db
					.insert(playerScores)
					.values({
						clerkUserId: identity.clerkUserId,
						anonId: null,
						username: identity.username,
						totalScore: drawerBonus,
						drawingScore: drawerBonus,
						drawingRounds: 1,
						roundsPlayed: 1,
					})
					.onConflictDoUpdate({
						target: playerScores.clerkUserId,
						set: {
							username: identity.username,
							totalScore: sql`${playerScores.totalScore} + ${drawerBonus}`,
							drawingScore: sql`${playerScores.drawingScore} + ${drawerBonus}`,
							drawingRounds: sql`${playerScores.drawingRounds} + 1`,
							roundsPlayed: sql`${playerScores.roundsPlayed} + 1`,
							updatedAt: new Date(),
						},
					});
			} else if (identity.anonId) {
				await db
					.insert(playerScores)
					.values({
						clerkUserId: null,
						anonId: identity.anonId,
						totalScore: drawerBonus,
						drawingScore: drawerBonus,
						drawingRounds: 1,
						roundsPlayed: 1,
					})
					.onConflictDoUpdate({
						target: playerScores.anonId,
						set: {
							totalScore: sql`${playerScores.totalScore} + ${drawerBonus}`,
							drawingScore: sql`${playerScores.drawingScore} + ${drawerBonus}`,
							drawingRounds: sql`${playerScores.drawingRounds} + 1`,
							roundsPlayed: sql`${playerScores.roundsPlayed} + 1`,
							updatedAt: new Date(),
						},
					});
			}
		}

		return NextResponse.json(
			{
				id: round.id,
				maxPossibleScore,
				topScore,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error saving round:", error);
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid request data", details: error.issues },
				{ status: 400 },
			);
		}
		return NextResponse.json(
			{ error: "Failed to save round" },
			{ status: 500 },
		);
	}
}
