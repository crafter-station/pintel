# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**pintel** is a multimodal AI evaluation game where humans and AI models draw, guess, and evaluate each other's drawings. Built for the Vercel AI Gateway Hackathon.

## Commands

```bash
bun dev          # Start development server with Turbopack
bun build        # Build for production
bun start        # Start production server
bun lint         # Run ESLint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **AI**: Vercel AI SDK v5 with AI Gateway (multi-model access via single API)
- **Auth**: Clerk (middleware-based route protection)
- **UI**: shadcn/ui components with Tailwind CSS v4
- **Language**: TypeScript, React 19

### Key Directories

```
app/
├── api/generate-drawings/    # AI drawing generation endpoint
├── play/human-judge/         # Human Judge game mode
├── sign-in/[[...sign-in]]/   # Clerk sign-in page
├── sign-up/[[...sign-up]]/   # Clerk sign-up page
lib/
├── models.ts                 # AI model configurations (GPT-4o, Claude, Gemini, Grok)
├── prompts.ts                # Drawing prompt pool
├── types.ts                  # TypeScript interfaces (Drawing, GameRound, GameState)
components/ui/                # shadcn/ui components
```

### AI Integration Pattern

The app uses AI SDK v5 with Vercel AI Gateway for multi-model access:

```typescript
import { generateObject } from "ai";

const result = await generateObject({
  model: "openai/gpt-4o",  // AI Gateway model string format: provider/model
  schema: zodSchema,
  prompt: "...",
});
```

Models are defined in `lib/models.ts` with the format `provider/model-name` (e.g., `anthropic/claude-sonnet-4`).

### Authentication

Clerk middleware in `middleware.ts` protects routes:
- **Public**: `/`, `/sign-in(.*)`, `/sign-up(.*)`
- **Protected**: `/play/*` (requires authentication)

### Game Flow (Human Judge Mode)

1. Random prompt selected from `lib/prompts.ts`
2. API calls all configured models in parallel via `generateObject`
3. Models return SVG drawings (structured output with Zod schema)
4. Drawings shuffled and displayed anonymously
5. User votes for best drawing
6. Results reveal model identities with leaderboard

## Environment Variables

```
AI_GATEWAY_API_KEY           # Vercel AI Gateway key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

Clerk keys auto-generate on first run.
