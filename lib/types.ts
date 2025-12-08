export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface Drawing {
  modelId: string;
  svg: string;
  generationTimeMs: number;
  usage?: TokenUsage;
  cost?: number;
  chunks?: string[];
}

export interface GameRound {
  id: string;
  prompt: string;
  drawings: Drawing[];
  votes: Record<string, number>;
  status: "generating" | "voting" | "results";
  startedAt: number;
  totalCost?: number;
}

export interface GameState {
  currentRound: GameRound | null;
  totalRounds: number;
  completedRounds: number;
  leaderboard: Record<string, number>;
  totalCost: number;
}
