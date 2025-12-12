-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "model_scores" (
	"model_id" text PRIMARY KEY NOT NULL,
	"drawing_score" real DEFAULT 0,
	"guessing_score" real DEFAULT 0,
	"drawing_rounds" integer DEFAULT 0,
	"guessing_rounds" integer DEFAULT 0,
	"human_judge_wins" integer DEFAULT 0,
	"human_judge_plays" integer DEFAULT 0,
	"model_guess_correct" integer DEFAULT 0,
	"model_guess_total" integer DEFAULT 0,
	"ai_duel_points" integer DEFAULT 0,
	"ai_duel_rounds" integer DEFAULT 0,
	"total_cost" real DEFAULT 0,
	"total_tokens" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode" text NOT NULL,
	"prompt" text NOT NULL,
	"total_cost" real DEFAULT 0,
	"total_tokens" integer DEFAULT 0,
	"total_time_ms" integer,
	"current_round" integer DEFAULT 1,
	"total_rounds" integer DEFAULT 1,
	"anon_id" text,
	"clerk_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drawings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"model_id" text NOT NULL,
	"svg" text NOT NULL,
	"generation_time_ms" integer,
	"cost" real,
	"tokens" integer,
	"is_winner" boolean DEFAULT false,
	"chunks" text
);
--> statement-breakpoint
CREATE TABLE "guesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"model_id" text NOT NULL,
	"guess" text NOT NULL,
	"is_correct" boolean DEFAULT false,
	"semantic_score" real,
	"time_bonus" integer DEFAULT 0,
	"final_score" integer DEFAULT 0,
	"is_human" boolean DEFAULT false,
	"generation_time_ms" integer,
	"cost" real,
	"tokens" integer,
	"round_id" uuid
);
--> statement-breakpoint
CREATE TABLE "player_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text,
	"anon_id" text,
	"username" text,
	"total_score" integer DEFAULT 0,
	"games_played" integer DEFAULT 0,
	"games_won" integer DEFAULT 0,
	"rounds_played" integer DEFAULT 0,
	"drawing_rounds" integer DEFAULT 0,
	"guessing_rounds" integer DEFAULT 0,
	"drawing_score" real DEFAULT 0,
	"guessing_score" real DEFAULT 0,
	"best_round_score" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "player_scores_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "player_scores_anon_id_unique" UNIQUE("anon_id")
);
--> statement-breakpoint
CREATE TABLE "round_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"drawer_id" text NOT NULL,
	"drawer_type" text NOT NULL,
	"prompt" text NOT NULL,
	"max_possible_score" integer NOT NULL,
	"top_score" integer DEFAULT 0,
	"svg" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drawings" ADD CONSTRAINT "drawings_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_round_id_round_results_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."round_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_results" ADD CONSTRAINT "round_results_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;
*/