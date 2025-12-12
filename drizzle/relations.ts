import { relations } from "drizzle-orm/relations";
import { drawings, gameSessions, guesses, roundResults } from "./schema";

export const drawingsRelations = relations(drawings, ({ one }) => ({
	gameSession: one(gameSessions, {
		fields: [drawings.sessionId],
		references: [gameSessions.id],
	}),
}));

export const gameSessionsRelations = relations(gameSessions, ({ many }) => ({
	drawings: many(drawings),
	guesses: many(guesses),
	roundResults: many(roundResults),
}));

export const guessesRelations = relations(guesses, ({ one }) => ({
	gameSession: one(gameSessions, {
		fields: [guesses.sessionId],
		references: [gameSessions.id],
	}),
	roundResult: one(roundResults, {
		fields: [guesses.roundId],
		references: [roundResults.id],
	}),
}));

export const roundResultsRelations = relations(
	roundResults,
	({ one, many }) => ({
		guesses: many(guesses),
		gameSession: one(gameSessions, {
			fields: [roundResults.sessionId],
			references: [gameSessions.id],
		}),
	}),
);
