import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	integer,
	pgTable,
	real,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

export const modelScores = pgTable("model_scores", {
	modelId: text("model_id").primaryKey().notNull(),
	drawingScore: real("drawing_score").default(0),
	guessingScore: real("guessing_score").default(0),
	drawingRounds: integer("drawing_rounds").default(0),
	guessingRounds: integer("guessing_rounds").default(0),
	humanJudgeWins: integer("human_judge_wins").default(0),
	humanJudgePlays: integer("human_judge_plays").default(0),
	modelGuessCorrect: integer("model_guess_correct").default(0),
	modelGuessTotal: integer("model_guess_total").default(0),
	aiDuelPoints: integer("ai_duel_points").default(0),
	aiDuelRounds: integer("ai_duel_rounds").default(0),
	totalCost: real("total_cost").default(0),
	totalTokens: integer("total_tokens").default(0),
	updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

export const gameSessions = pgTable("game_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	mode: text().notNull(),
	prompt: text().notNull(),
	totalCost: real("total_cost").default(0),
	totalTokens: integer("total_tokens").default(0),
	totalTimeMs: integer("total_time_ms"),
	currentRound: integer("current_round").default(1),
	totalRounds: integer("total_rounds").default(1),
	anonId: text("anon_id"),
	clerkUserId: text("clerk_user_id"),
	createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const drawings = pgTable(
	"drawings",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		sessionId: uuid("session_id").notNull(),
		modelId: text("model_id").notNull(),
		svg: text().notNull(),
		generationTimeMs: integer("generation_time_ms"),
		cost: real(),
		tokens: integer(),
		isWinner: boolean("is_winner").default(false),
		chunks: text(),
	},
	(table) => [
		foreignKey({
			columns: [table.sessionId],
			foreignColumns: [gameSessions.id],
			name: "drawings_session_id_game_sessions_id_fk",
		}).onDelete("cascade"),
	],
);

export const guesses = pgTable(
	"guesses",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		sessionId: uuid("session_id").notNull(),
		modelId: text("model_id").notNull(),
		guess: text().notNull(),
		isCorrect: boolean("is_correct").default(false),
		semanticScore: real("semantic_score"),
		timeBonus: integer("time_bonus").default(0),
		finalScore: integer("final_score").default(0),
		isHuman: boolean("is_human").default(false),
		generationTimeMs: integer("generation_time_ms"),
		cost: real(),
		tokens: integer(),
		roundId: uuid("round_id"),
	},
	(table) => [
		foreignKey({
			columns: [table.sessionId],
			foreignColumns: [gameSessions.id],
			name: "guesses_session_id_game_sessions_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.roundId],
			foreignColumns: [roundResults.id],
			name: "guesses_round_id_round_results_id_fk",
		}).onDelete("cascade"),
	],
);

export const playerScores = pgTable(
	"player_scores",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		clerkUserId: text("clerk_user_id"),
		anonId: text("anon_id"),
		username: text(),
		totalScore: integer("total_score").default(0),
		gamesPlayed: integer("games_played").default(0),
		gamesWon: integer("games_won").default(0),
		roundsPlayed: integer("rounds_played").default(0),
		drawingRounds: integer("drawing_rounds").default(0),
		guessingRounds: integer("guessing_rounds").default(0),
		drawingScore: real("drawing_score").default(0),
		guessingScore: real("guessing_score").default(0),
		bestRoundScore: integer("best_round_score").default(0),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
	},
	(table) => [
		unique("player_scores_clerk_user_id_unique").on(table.clerkUserId),
		unique("player_scores_anon_id_unique").on(table.anonId),
	],
);

export const roundResults = pgTable(
	"round_results",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		sessionId: uuid("session_id").notNull(),
		roundNumber: integer("round_number").notNull(),
		drawerId: text("drawer_id").notNull(),
		drawerType: text("drawer_type").notNull(),
		prompt: text().notNull(),
		maxPossibleScore: integer("max_possible_score").notNull(),
		topScore: integer("top_score").default(0),
		svg: text(),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.sessionId],
			foreignColumns: [gameSessions.id],
			name: "round_results_session_id_game_sessions_id_fk",
		}).onDelete("cascade"),
	],
);
