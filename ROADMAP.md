# pintel Roadmap

## Current State (v0.1)

### Implemented
- [x] Human Judge Mode - AI models draw, humans vote
- [x] 4 models: GPT-4o, Claude Sonnet, Gemini Flash, Grok
- [x] Cost tracking per drawing and session totals
- [x] Token usage metrics
- [x] Clerk authentication
- [x] Dark mode UI with shadcn/ui

---

## Phase 1: Polish Human Judge Mode

### 1.1 - Better Drawing Generation
- [ ] Improve SVG prompt engineering for more consistent results
- [ ] Add retry logic for failed generations
- [ ] Support image generation models (DALL-E, Imagen) alongside SVG
- [ ] Add drawing animation (strokes appearing progressively)

### 1.2 - Enhanced Voting Experience
- [ ] Add "Skip" option if all drawings are bad
- [ ] Multi-criteria voting (accuracy, creativity, style)
- [ ] Timed voting mode (15s to decide)
- [ ] Side-by-side comparison view

### 1.3 - Persistence & Sharing
- [ ] Save game history to database (Vercel Postgres)
- [ ] User profiles with stats
- [ ] Share results as image/link
- [ ] Global leaderboard across all users

---

## Phase 2: Model Guess Mode

Human draws on canvas, AI models compete to guess what it is.

### 2.1 - Drawing Canvas
- [ ] Implement drawing canvas component
- [ ] Support touch/stylus input
- [ ] Undo/redo functionality
- [ ] Color palette and brush sizes
- [ ] Export canvas to PNG/base64

### 2.2 - Vision API Integration
- [ ] Send canvas image to vision-capable models
- [ ] GPT-4o vision, Claude vision, Gemini vision
- [ ] Real-time guessing as user draws
- [ ] Confidence scores per guess

### 2.3 - Scoring System
- [ ] First correct guess wins
- [ ] Partial credit for close guesses
- [ ] Track which models are best at different categories
- [ ] Semantic similarity scoring (embeddings)

---

## Phase 3: AI Duel Mode

Fully autonomous: models draw AND guess each other's creations.

### 3.1 - Autonomous Loop
- [ ] Model A draws prompt
- [ ] Models B, C, D guess what A drew
- [ ] Score based on guess accuracy
- [ ] Rotate drawer role
- [ ] Run multiple rounds automatically

### 3.2 - Visualization
- [ ] Real-time display of autonomous games
- [ ] Speed controls (1x, 2x, 5x)
- [ ] Pause/resume
- [ ] Highlight interesting moments (confident wrong guesses, etc.)

### 3.3 - Tournament Mode
- [ ] Bracket-style competition
- [ ] Elimination rounds
- [ ] Finals with best-performing models
- [ ] Automated tournament scheduling

---

## Phase 4: Advanced Features

### 4.1 - Custom Prompts
- [ ] User-submitted prompts
- [ ] Prompt categories (animals, objects, abstract, etc.)
- [ ] Difficulty levels
- [ ] NSFW filter

### 4.2 - Model Configuration
- [ ] Add/remove models dynamically
- [ ] Custom model settings (temperature, etc.)
- [ ] Bring your own API keys (BYOK)
- [ ] Model cost comparison view

### 4.3 - Analytics Dashboard
- [ ] Model performance over time
- [ ] Cost trends
- [ ] Popular prompts
- [ ] Win rate by category

### 4.4 - Multiplayer
- [ ] Real-time multiplayer rooms
- [ ] Join friends via link
- [ ] Live chat
- [ ] Competitive mode (humans vs each other using AI tools)

---

## Phase 5: Platform & Scale

### 5.1 - API & SDK
- [ ] Public API for running evaluations
- [ ] Embed widget for other sites
- [ ] CLI tool for batch evaluations

### 5.2 - Enterprise Features
- [ ] Team workspaces
- [ ] Usage quotas
- [ ] Custom model integrations
- [ ] Audit logs

---

## Technical Debt & Improvements

- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Add loading states for all async operations
- [ ] Write E2E tests with Playwright
- [ ] Set up CI/CD pipeline
- [ ] Add Sentry for error tracking
- [ ] Implement proper caching (Redis/Upstash)
- [ ] Optimize bundle size

---

## Model Wishlist

Add these models when available via AI Gateway:
- [ ] GPT-5 (when released)
- [ ] Claude Opus
- [ ] Gemini Ultra
- [ ] Llama 3.1 405B
- [ ] Mistral Large
- [ ] DeepSeek
