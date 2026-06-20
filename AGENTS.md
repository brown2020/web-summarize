# Repository Guidance

## Project Shape

Web Summarize is a Next.js 16 App Router application for scraping public HTML pages and generating AI summaries with Vercel AI SDK providers. The main user flow is:

1. `src/components/SummarizerForm.tsx` collects URL, language, model, and word count.
2. `src/hooks/useSummarizer.ts` fetches extracted text from `/api/proxy`, manages progress, cancellation, stale-run prevention, and summary streaming.
3. `src/app/api/proxy/route.ts` validates and fetches HTML server-side, applies DNS pinning and private-network blocking, then extracts readable text with Cheerio.
4. `src/actions/generateActions.ts` validates summary inputs, checks provider availability, and streams model output.
5. `src/store/summarizerStore.ts` holds form, progress, extracted text, summary, pending, and error state.

## Commands

- `npm run dev`: start the local Next.js dev server with Turbopack.
- `npm run lint`: run ESLint across the repo.
- `npm test`: run Vitest once.
- `npm run test:watch`: run Vitest in watch mode.
- `npm run build`: build the production Next.js app.

Run `npm run lint` before pushing changes. For behavior changes, add or update focused Vitest tests and run `npm test`; run `npm run build` before release-oriented changes.

## Environment

Use `.env.example` as the public reference for required keys. Do not read, print, commit, or document values from `.env.local`. At least one provider key is needed for live summarization:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `MISTRAL_API_KEY`
- `FIREWORKS_API_KEY`

Model availability is intentionally filtered in `src/lib/model-availability.ts` from configured environment keys.

## Code Boundaries

- Keep app routes under `src/app/`; server-only scraping lives in `src/app/api/proxy/route.ts`.
- Keep AI provider selection and streaming in `src/actions/generateActions.ts`.
- Keep summarization orchestration and cancellation in `src/hooks/useSummarizer.ts`.
- Keep shared limits, progress steps, and validation ranges in `src/constants/app.ts`.
- Keep URL and network validation helpers in `src/utils/` with Vitest coverage.
- Keep UI primitives in `src/components/ui/` and feature components in `src/components/`.

Preserve the existing `@/*` path alias from `tsconfig.json`. Prefer tightening existing helpers and boundaries before adding new layers.

## Safety Notes

- Preserve SSRF protections when changing URL fetching: reject localhost and embedded credentials, block private/special-use IPs, keep redirect validation, and keep pinned DNS lookup behavior.
- Preserve stale-run protection in `useSummarizer`: run IDs and abort controllers prevent older async work from updating current UI state.
- Keep provider API keys server-side. Client code should receive only filtered model options and UI-safe state.
- Avoid broad lockfile churn. Package updates should be small, verified, and tied to a kept dependency change.

## Documentation

`SPEC.md` records current implementation and validation evidence. README contains user-facing documentation and candidate roadmap ideas; do not convert roadmap ideas into approved work without user direction.
