import { count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { gameSessions, modelScores } from "@/db/schema";
import { getModelById } from "@/lib/models";

export async function GET() {
	try {
		const [scores, totalSessionsResult] = await Promise.all([
			db.select().from(modelScores),
			db.select({ count: count() }).from(gameSessions),
		]);

		const totalSessions = totalSessionsResult[0]?.count || 0;

		const models = scores
			.map((score) => {
				const humanJudgePlays = score.humanJudgePlays ?? 0;
				const humanJudgeWins = score.humanJudgeWins ?? 0;
				const modelGuessTotal = score.modelGuessTotal ?? 0;
				const modelGuessCorrect = score.modelGuessCorrect ?? 0;
				const aiDuelRounds = score.aiDuelRounds ?? 0;
				const aiDuelPoints = score.aiDuelPoints ?? 0;

				const humanJudgeWinRate =
					humanJudgePlays > 0 ? (humanJudgeWins / humanJudgePlays) * 100 : 0;

				const modelGuessAccuracy =
					modelGuessTotal > 0 ? (modelGuessCorrect / modelGuessTotal) * 100 : 0;

				const overallScore =
					humanJudgeWinRate * 0.4 +
					modelGuessAccuracy * 0.4 +
					(aiDuelRounds > 0 ? (aiDuelPoints / aiDuelRounds) * 10 : 0) * 0.2;

				return {
					modelId: score.modelId,
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
				};
			})
			.filter((m) => {
				const model = getModelById(m.modelId);
				return model !== undefined;
			})
			.sort((a, b) => b.overallScore - a.overallScore);

		return NextResponse.json({
			models,
			totalSessions,
		});
	} catch (error) {
		console.error("Error fetching leaderboard:", error);
		return NextResponse.json(
			{ error: "Failed to fetch leaderboard" },
			{ status: 500 },
		);
	}
}
