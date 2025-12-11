import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	pgTable,
	real,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod";

// Zod schemas for type safety
export const GameModeSchema = z.enum(["human_judge", "model_guess", "ai_duel"]);

export const gameSessions = pgTable("game_sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	mode: text("mode", {
		enum: ["human_judge", "model_guess", "ai_duel"],
	}).notNull(),
	prompt: text("prompt").notNull(),
	totalCost: real("total_cost").default(0),
	totalTokens: integer("total_tokens").default(0),
	totalTimeMs: integer("total_time_ms"),
	anonId: text("anon_id"),
	clerkUserId: text("clerk_user_id"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const drawings = pgTable("drawings", {
	id: uuid("id").primaryKey().defaultRandom(),
	sessionId: uuid("session_id")
		.references(() => gameSessions.id, { onDelete: "cascade" })
		.notNull(),
	modelId: text("model_id").notNull(),
	svg: text("svg").notNull(),
	generationTimeMs: integer("generation_time_ms"),
	cost: real("cost"),
	tokens: integer("tokens"),
	isWinner: boolean("is_winner").default(false),
	chunks: text("chunks"), // JSON array of partial SVGs for replay
});

export const guesses = pgTable("guesses", {
	id: uuid("id").primaryKey().defaultRandom(),
	sessionId: uuid("session_id")
		.references(() => gameSessions.id, { onDelete: "cascade" })
		.notNull(),
	modelId: text("model_id").notNull(),
	guess: text("guess").notNull(),
	isCorrect: boolean("is_correct").default(false),
	generationTimeMs: integer("generation_time_ms"),
	cost: real("cost"),
	tokens: integer("tokens"),
});

export const modelScores = pgTable("model_scores", {
	modelId: text("model_id").primaryKey(),
	humanJudgeWins: integer("human_judge_wins").default(0),
	humanJudgePlays: integer("human_judge_plays").default(0),
	modelGuessCorrect: integer("model_guess_correct").default(0),
	modelGuessTotal: integer("model_guess_total").default(0),
	aiDuelPoints: integer("ai_duel_points").default(0),
	aiDuelRounds: integer("ai_duel_rounds").default(0),
	totalCost: real("total_cost").default(0),
	totalTokens: integer("total_tokens").default(0),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const gameSessionsRelations = relations(gameSessions, ({ many }) => ({
	drawings: many(drawings),
	guesses: many(guesses),
}));

export const drawingsRelations = relations(drawings, ({ one }) => ({
	session: one(gameSessions, {
		fields: [drawings.sessionId],
		references: [gameSessions.id],
	}),
}));

export const guessesRelations = relations(guesses, ({ one }) => ({
	session: one(gameSessions, {
		fields: [guesses.sessionId],
		references: [gameSessions.id],
	}),
}));

// Type exports
export type GameSession = typeof gameSessions.$inferSelect;
export type NewGameSession = typeof gameSessions.$inferInsert;
export type Drawing = typeof drawings.$inferSelect;
export type NewDrawing = typeof drawings.$inferInsert;
export type Guess = typeof guesses.$inferSelect;
export type NewGuess = typeof guesses.$inferInsert;
export type ModelScore = typeof modelScores.$inferSelect;
export type NewModelScore = typeof modelScores.$inferInsert;
