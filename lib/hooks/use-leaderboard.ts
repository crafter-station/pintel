import { useQuery } from "@tanstack/react-query";

export type LeaderboardType = "combined" | "llm" | "human";

export interface LeaderboardEntry {
	id: string;
	type: "llm" | "human";
	name: string;
	modelId?: string;
	clerkUserId?: string | null;
	anonId?: string | null;
	drawingScore: number;
	guessingScore: number;
	drawingRounds: number;
	guessingRounds: number;
	overallScore: number;
	totalScore: number;
	roundsPlayed: number;
	gamesPlayed: number;
	gamesWon: number;
	bestRoundScore: number;
	totalCost: number;
	totalTokens: number;
	humanJudgeWins?: number;
	humanJudgePlays?: number;
	humanJudgeWinRate?: number;
	modelGuessCorrect?: number;
	modelGuessTotal?: number;
	modelGuessAccuracy?: number;
	aiDuelPoints?: number;
	aiDuelRounds?: number;
}

export interface LeaderboardResponse {
	entries: LeaderboardEntry[];
	models: LeaderboardEntry[];
	players: LeaderboardEntry[];
	totalSessions: number;
	type: LeaderboardType;
}

export function useLeaderboard(type: LeaderboardType = "combined") {
	return useQuery({
		queryKey: ["leaderboard", type],
		queryFn: async (): Promise<LeaderboardResponse> => {
			const res = await fetch(`/api/leaderboard?type=${type}`);
			if (!res.ok) throw new Error("Failed to fetch leaderboard");
			return res.json();
		},
		staleTime: 30 * 1000,
	});
}
