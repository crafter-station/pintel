# AGENTS.md

## Commands
```bash
bun dev          # Dev server (Turbopack)
bun build        # Production build
bun lint         # ESLint
bun db:push      # Push schema to database
bun db:studio    # Drizzle Studio
```
No test framework configured.

## Code Style
- **Imports**: Use `@/*` path alias (e.g., `@/lib/utils`, `@/components/ui/button`)
- **Components**: `"use client"` directive for client components; use `cn()` from `@/lib/utils` for className merging
- **Types**: Strict TypeScript; infer DB types via `$inferSelect`/`$inferInsert`; use Zod for runtime validation
- **Naming**: camelCase for functions/variables, PascalCase for components/types, SCREAMING_SNAKE for constants
- **Error handling**: try/catch with `Response.json({ error }, { status })` in API routes
- **No comments** unless explicitly requested
- **Formatting**: 2-space indent, double quotes for JSX strings, template literals for interpolation
- **AI SDK**: Use `@ai-sdk/gateway` with model format `provider/model-name` (e.g., `openai/gpt-4o`)
- **UI**: shadcn/ui components from `@/components/ui/*`; Lucide icons
