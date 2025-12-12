import { count } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { gameSessions, modelScores, playerScores } from "@/db/schema";
import { getModelById } from "@/lib/models";

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const type = searchParams.get("type") || "combined";

		const [llmScores, humanScores, totalSessionsResult] = await Promise.all([
			db.select().from(modelScores),
			db.select().from(playerScores),
			db.select({ count: count() }).from(gameSessions),
		]);

		const totalSessions = totalSessionsResult[0]?.count || 0;

		const models = llmScores
			.map((score) => {
				const drawingScore = score.drawingScore ?? 0;
				const guessingScore = score.guessingScore ?? 0;
				const drawingRounds = score.drawingRounds ?? 0;
				const guessingRounds = score.guessingRounds ?? 0;
				const humanJudgePlays = score.humanJudgePlays ?? 0;
				const humanJudgeWins = score.humanJudgeWins ?? 0;
				const modelGuessTotal = score.modelGuessTotal ?? 0;
				const modelGuessCorrect = score.modelGuessCorrect ?? 0;
				const aiDuelRounds = score.aiDuelRounds ?? 0;
				const aiDuelPoints = score.aiDuelPoints ?? 0;

				const avgDrawingScore =
					drawingRounds > 0 ? drawingScore / drawingRounds : 0;
				const avgGuessingScore =
					guessingRounds > 0 ? guessingScore / guessingRounds : 0;

				const humanJudgeWinRate =
					humanJudgePlays > 0 ? (humanJudgeWins / humanJudgePlays) * 100 : 0;

				const modelGuessAccuracy =
					modelGuessTotal > 0 ? (modelGuessCorrect / modelGuessTotal) * 100 : 0;

				const totalRounds = drawingRounds + guessingRounds;
				const overallScore =
					totalRounds > 0
						? (avgDrawingScore * 0.5 + avgGuessingScore * 0.5) * 10
						: humanJudgeWinRate * 0.4 +
							modelGuessAccuracy * 0.4 +
							(aiDuelRounds > 0 ? (aiDuelPoints / aiDuelRounds) * 10 : 0) * 0.2;

				return {
					id: score.modelId,
					type: "llm" as const,
					name: getModelById(score.modelId)?.name || score.modelId,
					modelId: score.modelId,
					drawingScore: Math.round(avgDrawingScore * 100) / 100,
					guessingScore: Math.round(avgGuessingScore * 100) / 100,
					drawingRounds,
					guessingRounds,
					humanJudgeWins,
					humanJudgePlays,
					humanJudgeWinRate: Math.round(humanJudgeWinRate * 100) / 100,
					modelGuessCorrect,
					modelGuessTotal,
					modelGuessAccuracy: Math.round(modelGuessAccuracy * 100) / 100,
					aiDuelPoints,
					aiDuelRounds,
					totalCost: score.totalCost ?? 0,
					totalTokens: score.totalTokens ?? 0,
					overallScore: Math.round(overallScore * 100) / 100,
					totalScore: score.drawingScore ?? 0 + (score.guessingScore ?? 0),
					roundsPlayed: totalRounds,
					gamesPlayed: 0,
					gamesWon: 0,
					bestRoundScore: 0,
				};
			})
			.filter((m) => {
				const model = getModelById(m.modelId);
				return model !== undefined;
			});

		const players = humanScores.map((score) => {
			const drawingRounds = score.drawingRounds ?? 0;
			const guessingRounds = score.guessingRounds ?? 0;
			const avgDrawingScore =
				drawingRounds > 0 ? (score.drawingScore ?? 0) / drawingRounds : 0;
			const avgGuessingScore =
				guessingRounds > 0 ? (score.guessingScore ?? 0) / guessingRounds : 0;
			const totalRounds = drawingRounds + guessingRounds;
			const overallScore =
				totalRounds > 0
					? (avgDrawingScore * 0.5 + avgGuessingScore * 0.5) * 10
					: 0;

			return {
				id: score.id,
				type: "human" as const,
				name: score.username || "Anonymous Player",
				clerkUserId: score.clerkUserId,
				anonId: score.anonId,
				drawingScore: Math.round(avgDrawingScore * 100) / 100,
				guessingScore: Math.round(avgGuessingScore * 100) / 100,
				drawingRounds,
				guessingRounds,
				overallScore: Math.round(overallScore * 100) / 100,
				totalScore: score.totalScore ?? 0,
				roundsPlayed: score.roundsPlayed ?? 0,
				gamesPlayed: score.gamesPlayed ?? 0,
				gamesWon: score.gamesWon ?? 0,
				bestRoundScore: score.bestRoundScore ?? 0,
				totalCost: 0,
				totalTokens: 0,
			};
		});

		let result;
		if (type === "llm") {
			result = models.sort((a, b) => b.overallScore - a.overallScore);
		} else if (type === "human") {
			result = players.sort((a, b) => b.overallScore - a.overallScore);
		} else {
			const combined = [...models, ...players].sort(
				(a, b) => b.overallScore - a.overallScore,
			);
			result = combined;
		}

		return NextResponse.json({
			entries: result,
			models: models.sort((a, b) => b.overallScore - a.overallScore),
			players: players.sort((a, b) => b.overallScore - a.overallScore),
			totalSessions,
			type,
		});
	} catch (error) {
		console.error("Error fetching leaderboard:", error);
		return NextResponse.json(
			{ error: "Failed to fetch leaderboard" },
			{ status: 500 },
		);
	}
}
