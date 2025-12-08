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
├── api/
│   ├── generate-drawings/    # AI drawing generation endpoint
│   └── guess-drawing/        # AI guessing endpoint
├── play/
│   ├── human-judge/          # Human judges AI drawings
│   ├── model-guess/          # AI guesses human drawings
│   └── ai-duel/              # AI vs AI battles
├── sign-in/[[...sign-in]]/   # Clerk sign-in page
├── sign-up/[[...sign-up]]/   # Clerk sign-up page
lib/
├── models.ts                 # AI model configurations (GPT-4o, Claude, Gemini, Grok)
├── prompts.ts                # Drawing prompt pool
├── types.ts                  # TypeScript interfaces
components/
├── ui/                       # shadcn/ui components
├── drawing-canvas.tsx        # Canvas for human drawing input
├── animated-svg.tsx          # SVG animation component
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

### Game Modes

**Human Judge** — Human picks the best AI-generated drawing
1. Random prompt selected from `lib/prompts.ts`
2. Multiple AI models generate SVG drawings in parallel
3. Drawings shuffled and displayed anonymously
4. User votes for best drawing
5. Results reveal model identities

**Model Guess** — AI tries to guess what the human drew
1. User draws on canvas based on a prompt
2. AI models analyze the drawing
3. Models submit guesses
4. Compare accuracy across models

**AI Duel** — AI models compete head-to-head
1. Two AI models draw the same prompt
2. Another AI model judges the winner
3. Track model performance over rounds

## Environment Variables

```
AI_GATEWAY_API_KEY           # Vercel AI Gateway key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

Clerk keys auto-generate on first run.
