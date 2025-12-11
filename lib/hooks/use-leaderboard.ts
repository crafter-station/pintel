import { useQuery } from "@tanstack/react-query";

export interface ModelScore {
	modelId: string;
	humanJudgeWins: number;
	humanJudgePlays: number;
	humanJudgeWinRate: number;
	modelGuessCorrect: number;
	modelGuessTotal: number;
	modelGuessAccuracy: number;
	aiDuelPoints: number;
	aiDuelRounds: number;
	totalCost: number;
	totalTokens: number;
	overallScore: number;
}

export interface LeaderboardResponse {
	models: ModelScore[];
	totalSessions: number;
}

export function useLeaderboard() {
	return useQuery({
		queryKey: ["leaderboard"],
		queryFn: async (): Promise<LeaderboardResponse> => {
			const res = await fetch("/api/leaderboard");
			if (!res.ok) throw new Error("Failed to fetch leaderboard");
			return res.json();
		},
		staleTime: 30 * 1000,
	});
}
