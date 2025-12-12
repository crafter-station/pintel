import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
	drawings,
	gameSessions,
	guesses,
	modelScores,
	playerScores,
	roundResults,
} from "@/db/schema";
import { getCurrentIdentity } from "@/lib/identity";

const SaveSessionSchema = z.object({
	mode: z.enum(["pictionary", "human_judge", "model_guess", "ai_duel"]),
	prompt: z.string(),
	totalCost: z.number(),
	totalTokens: z.number(),
	totalTimeMs: z.number().optional(),
	drawings: z.array(
		z.object({
			modelId: z.string(),
			svg: z.string(),
			generationTimeMs: z.number().optional(),
			cost: z.number().optional(),
			tokens: z.number().optional(),
			isWinner: z.boolean().optional(),
			chunks: z.array(z.string()).optional(), // Partial SVGs for replay
		}),
	),
	guesses: z
		.array(
			z.object({
				modelId: z.string(),
				guess: z.string(),
				isCorrect: z.boolean(),
				semanticScore: z.number().optional(),
				timeBonus: z.number().optional(),
				finalScore: z.number().optional(),
				isHuman: z.boolean().optional(),
				generationTimeMs: z.number().optional(),
				cost: z.number().optional(),
				tokens: z.number().optional(),
			}),
		)
		.optional(),
});

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const mode = searchParams.get("mode");
		const mine = searchParams.get("mine") === "true";
		const page = parseInt(searchParams.get("page") || "1", 10);
		const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
		const offset = (page - 1) * pageSize;

		const identity = await getCurrentIdentity(request);
		const whereConditions = [];

		if (mode) {
			whereConditions.push(eq(gameSessions.mode, mode as any));
		}

		if (mine) {
			if (identity.clerkUserId) {
				whereConditions.push(
					eq(gameSessions.clerkUserId, identity.clerkUserId),
				);
			} else if (identity.anonId) {
				whereConditions.push(eq(gameSessions.anonId, identity.anonId));
			} else {
				return NextResponse.json({ items: [], total: 0, page, pageSize });
			}
		}

		const [sessions, totalResult] = await Promise.all([
			db
				.select()
				.from(gameSessions)
				.where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
				.orderBy(desc(gameSessions.createdAt))
				.limit(pageSize)
				.offset(offset),
			db
				.select({ count: count() })
				.from(gameSessions)
				.where(
					whereConditions.length > 0 ? and(...whereConditions) : undefined,
				),
		]);

		const total = totalResult[0]?.count || 0;

		const sessionIds = sessions.map((s) => s.id);

		const clerkUserIds = sessions
			.map((s) => s.clerkUserId)
			.filter((id): id is string => id !== null);
		const anonIds = sessions
			.map((s) => s.anonId)
			.filter((id): id is string => id !== null);

		const [allDrawings, allGuesses, allRounds, allPlayerScores] =
			await Promise.all([
				sessionIds.length > 0
					? db
							.select()
							.from(drawings)
							.where(inArray(drawings.sessionId, sessionIds))
					: [],
				sessionIds.length > 0
					? db
							.select()
							.from(guesses)
							.where(inArray(guesses.sessionId, sessionIds))
					: [],
				sessionIds.length > 0
					? db
							.select()
							.from(roundResults)
							.where(inArray(roundResults.sessionId, sessionIds))
							.orderBy(asc(roundResults.roundNumber))
					: [],
				clerkUserIds.length > 0 || anonIds.length > 0
					? db.select().from(playerScores)
					: [],
			]);

		const playersByClerkId = allPlayerScores.reduce(
			(acc, p) => {
				if (p.clerkUserId) acc[p.clerkUserId] = p;
				return acc;
			},
			{} as Record<string, typeof playerScores.$inferSelect>,
		);

		const playersByAnonId = allPlayerScores.reduce(
			(acc, p) => {
				if (p.anonId) acc[p.anonId] = p;
				return acc;
			},
			{} as Record<string, typeof playerScores.$inferSelect>,
		);

		const drawingsBySession = allDrawings.reduce(
			(acc, d) => {
				if (!acc[d.sessionId]) acc[d.sessionId] = [];
				acc[d.sessionId].push(d);
				return acc;
			},
			{} as Record<string, Array<typeof drawings.$inferSelect>>,
		);

		const guessesBySession = allGuesses.reduce(
			(acc, g) => {
				if (!acc[g.sessionId]) acc[g.sessionId] = [];
				acc[g.sessionId].push(g);
				return acc;
			},
			{} as Record<string, Array<typeof guesses.$inferSelect>>,
		);

		const roundsBySession = allRounds.reduce(
			(acc, r) => {
				if (!acc[r.sessionId]) acc[r.sessionId] = [];
				acc[r.sessionId].push(r);
				return acc;
			},
			{} as Record<string, Array<typeof roundResults.$inferSelect>>,
		);

		const items = sessions.map((session) => {
			const sessionDrawings = drawingsBySession[session.id] || [];
			const sessionRounds = roundsBySession[session.id] || [];

			const player = session.clerkUserId
				? playersByClerkId[session.clerkUserId]
				: session.anonId
					? playersByAnonId[session.anonId]
					: null;

			const allSessionDrawings = [
				...sessionDrawings.map((d) => ({
					id: d.id,
					modelId: d.modelId,
					svg: d.svg,
					generationTimeMs: d.generationTimeMs,
					cost: d.cost,
					isWinner: d.isWinner,
					chunks: d.chunks ? JSON.parse(d.chunks as string) : null,
					isHumanDrawing: false,
				})),
				...sessionRounds
					.filter((r) => r.drawerType === "human" && r.svg)
					.map((r) => ({
						id: r.id,
						modelId: "human",
						svg: r.svg as string,
						generationTimeMs: null,
						cost: null,
						isWinner: false,
						chunks: null,
						isHumanDrawing: true,
					})),
			];

			return {
				id: session.id,
				mode: session.mode,
				prompt: session.prompt,
				totalCost: session.totalCost || 0,
				totalTokens: session.totalTokens || 0,
				totalTimeMs: session.totalTimeMs,
				createdAt: session.createdAt.toISOString(),
				playerName: player?.username || null,
				drawings: allSessionDrawings,
				guesses: (guessesBySession[session.id] || []).map((g) => ({
					id: g.id,
					modelId: g.modelId,
					guess: g.guess,
					isCorrect: g.isCorrect,
					generationTimeMs: g.generationTimeMs,
				})),
			};
		});

		return NextResponse.json({
			items,
			total,
			page,
			pageSize,
		});
	} catch (error) {
		console.error("Error fetching gallery:", error);
		return NextResponse.json(
			{ error: "Failed to fetch gallery" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const data = SaveSessionSchema.parse(body);
		const identity = await getCurrentIdentity(request);

		const [session] = await db
			.insert(gameSessions)
			.values({
				mode: data.mode,
				prompt: data.prompt,
				totalCost: data.totalCost,
				totalTokens: data.totalTokens,
				totalTimeMs: data.totalTimeMs,
				anonId: identity.anonId || null,
				clerkUserId: identity.clerkUserId || null,
			})
			.returning();

		if (!session) {
			throw new Error("Failed to create session");
		}

		await db.insert(drawings).values(
			data.drawings.map((d) => ({
				sessionId: session.id,
				modelId: d.modelId,
				svg: d.svg,
				generationTimeMs: d.generationTimeMs,
				cost: d.cost,
				tokens: d.tokens,
				isWinner: d.isWinner || false,
				chunks: d.chunks ? JSON.stringify(d.chunks) : null,
			})),
		);

		if (data.guesses && data.guesses.length > 0) {
			await db.insert(guesses).values(
				data.guesses.map((g) => ({
					sessionId: session.id,
					modelId: g.modelId,
					guess: g.guess,
					isCorrect: g.isCorrect,
					semanticScore: g.semanticScore,
					timeBonus: g.timeBonus,
					finalScore: g.finalScore,
					isHuman: g.isHuman,
					generationTimeMs: g.generationTimeMs,
					cost: g.cost,
					tokens: g.tokens,
				})),
			);
		}

		await updateModelScores(data);

		return NextResponse.json({ id: session.id }, { status: 201 });
	} catch (error) {
		console.error("Error saving session:", error);
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid request data", details: error.issues },
				{ status: 400 },
			);
		}
		return NextResponse.json(
			{ error: "Failed to save session" },
			{ status: 500 },
		);
	}
}

async function updateModelScores(data: z.infer<typeof SaveSessionSchema>) {
	const modelUpdates = new Map<
		string,
		{
			humanJudgePlays?: number;
			humanJudgeWins?: number;
			modelGuessTotal?: number;
			modelGuessCorrect?: number;
			aiDuelPoints?: number;
			aiDuelRounds?: number;
			drawingScore?: number;
			guessingScore?: number;
			drawingRounds?: number;
			guessingRounds?: number;
			cost: number;
			tokens: number;
		}
	>();

	// Track per-model costs and tokens from drawings
	data.drawings.forEach((d) => {
		const existing = modelUpdates.get(d.modelId) || { cost: 0, tokens: 0 };
		modelUpdates.set(d.modelId, {
			...existing,
			cost: existing.cost + (d.cost || 0),
			tokens: existing.tokens + (d.tokens || 0),
		});
	});

	// Track per-model costs from guesses
	data.guesses?.forEach((g) => {
		const existing = modelUpdates.get(g.modelId) || { cost: 0, tokens: 0 };
		modelUpdates.set(g.modelId, {
			...existing,
			cost: existing.cost + (g.cost || 0),
			tokens: existing.tokens + (g.tokens || 0),
		});
	});

	if (data.mode === "human_judge") {
		data.drawings.forEach((d) => {
			const existing = modelUpdates.get(d.modelId) || { cost: 0, tokens: 0 };
			modelUpdates.set(d.modelId, {
				...existing,
				humanJudgePlays: (existing.humanJudgePlays || 0) + 1,
				humanJudgeWins: (existing.humanJudgeWins || 0) + (d.isWinner ? 1 : 0),
			});
		});
	} else if (data.mode === "model_guess") {
		data.guesses?.forEach((g) => {
			const existing = modelUpdates.get(g.modelId) || { cost: 0, tokens: 0 };
			modelUpdates.set(g.modelId, {
				...existing,
				modelGuessTotal: (existing.modelGuessTotal || 0) + 1,
				modelGuessCorrect:
					(existing.modelGuessCorrect || 0) + (g.isCorrect ? 1 : 0),
			});
		});
	} else if (data.mode === "ai_duel") {
		const drawer = data.drawings[0]?.modelId;
		if (drawer) {
			const existing = modelUpdates.get(drawer) || { cost: 0, tokens: 0 };
			modelUpdates.set(drawer, {
				...existing,
				aiDuelRounds: (existing.aiDuelRounds || 0) + 1,
			});
		}

		const correctGuesses = data.guesses?.filter((g) => g.isCorrect) || [];
		const sortedCorrect = correctGuesses.sort(
			(a, b) => (a.generationTimeMs || 0) - (b.generationTimeMs || 0),
		);
		const firstCorrect = sortedCorrect[0];

		if (firstCorrect) {
			const existing = modelUpdates.get(firstCorrect.modelId) || {
				cost: 0,
				tokens: 0,
			};
			modelUpdates.set(firstCorrect.modelId, {
				...existing,
				aiDuelPoints: (existing.aiDuelPoints || 0) + 3,
				aiDuelRounds: (existing.aiDuelRounds || 0) + 1,
			});
		}

		data.guesses?.forEach((g) => {
			if (g.isCorrect && g.modelId !== firstCorrect?.modelId) {
				const existing = modelUpdates.get(g.modelId) || { cost: 0, tokens: 0 };
				modelUpdates.set(g.modelId, {
					...existing,
					aiDuelPoints: (existing.aiDuelPoints || 0) + 1,
					aiDuelRounds: (existing.aiDuelRounds || 0) + 1,
				});
			} else if (!g.isCorrect) {
				const existing = modelUpdates.get(g.modelId) || { cost: 0, tokens: 0 };
				modelUpdates.set(g.modelId, {
					...existing,
					aiDuelRounds: (existing.aiDuelRounds || 0) + 1,
				});
			}
		});

		if (drawer && correctGuesses.length === 0) {
			const existing = modelUpdates.get(drawer) || { cost: 0, tokens: 0 };
			modelUpdates.set(drawer, {
				...existing,
				aiDuelPoints: (existing.aiDuelPoints || 0) + 1,
			});
		}
	} else if (data.mode === "pictionary") {
		data.drawings.forEach((d) => {
			const existing = modelUpdates.get(d.modelId) || { cost: 0, tokens: 0 };
			const drawerBonus =
				data.guesses?.reduce((sum, g) => {
					if (g.modelId === d.modelId) return sum;
					const multiplier = g.isHuman ? 1.5 : 1;
					return sum + ((g.semanticScore || 0) > 0.7 ? 10 * multiplier : 0);
				}, 0) || 0;
			modelUpdates.set(d.modelId, {
				...existing,
				drawingScore: (existing.drawingScore || 0) + drawerBonus,
				drawingRounds: (existing.drawingRounds || 0) + 1,
			});
		});

		data.guesses?.forEach((g) => {
			const existing = modelUpdates.get(g.modelId) || { cost: 0, tokens: 0 };
			modelUpdates.set(g.modelId, {
				...existing,
				guessingScore: (existing.guessingScore || 0) + (g.semanticScore || 0),
				guessingRounds: (existing.guessingRounds || 0) + 1,
			});
		});
	}

	for (const [modelId, updates] of modelUpdates.entries()) {
		await db
			.insert(modelScores)
			.values({
				modelId,
				humanJudgePlays: updates.humanJudgePlays || 0,
				humanJudgeWins: updates.humanJudgeWins || 0,
				modelGuessTotal: updates.modelGuessTotal || 0,
				modelGuessCorrect: updates.modelGuessCorrect || 0,
				aiDuelPoints: updates.aiDuelPoints || 0,
				aiDuelRounds: updates.aiDuelRounds || 0,
				drawingScore: updates.drawingScore || 0,
				guessingScore: updates.guessingScore || 0,
				drawingRounds: updates.drawingRounds || 0,
				guessingRounds: updates.guessingRounds || 0,
				totalCost: updates.cost,
				totalTokens: updates.tokens,
			})
			.onConflictDoUpdate({
				target: modelScores.modelId,
				set: {
					humanJudgeWins: sql`${modelScores.humanJudgeWins} + ${updates.humanJudgeWins || 0}`,
					humanJudgePlays: sql`${modelScores.humanJudgePlays} + ${updates.humanJudgePlays || 0}`,
					modelGuessCorrect: sql`${modelScores.modelGuessCorrect} + ${updates.modelGuessCorrect || 0}`,
					modelGuessTotal: sql`${modelScores.modelGuessTotal} + ${updates.modelGuessTotal || 0}`,
					aiDuelPoints: sql`${modelScores.aiDuelPoints} + ${updates.aiDuelPoints || 0}`,
					aiDuelRounds: sql`${modelScores.aiDuelRounds} + ${updates.aiDuelRounds || 0}`,
					drawingScore: sql`${modelScores.drawingScore} + ${updates.drawingScore || 0}`,
					guessingScore: sql`${modelScores.guessingScore} + ${updates.guessingScore || 0}`,
					drawingRounds: sql`${modelScores.drawingRounds} + ${updates.drawingRounds || 0}`,
					guessingRounds: sql`${modelScores.guessingRounds} + ${updates.guessingRounds || 0}`,
					totalCost: sql`${modelScores.totalCost} + ${updates.cost}`,
					totalTokens: sql`${modelScores.totalTokens} + ${updates.tokens}`,
					updatedAt: new Date(),
				},
			});
	}
}
