# Web Summarize Current-State Spec

## Purpose

Web Summarize is a Next.js web application that accepts a public webpage URL, extracts readable HTML text server-side, and streams an AI-generated summary in a selected language and approximate word count.

## Shipped User Workflows

- Enter a webpage URL with or without `http://` or `https://`; valid missing protocols are normalized to `https://`.
- Choose a summary language from English, French, Spanish, German, Italian, Portuguese, Chinese, Russian, Hindi, and Japanese.
- Choose an AI model from the environment-configured provider catalog.
- Choose a target summary length between 10 and 300 words.
- Generate a streaming summary with progress labels for fetching, extraction, AI processing, and completion.
- Cancel local streaming, retry after an error, regenerate with the current settings, or regenerate from edited extracted text.
- Copy the summary, download it as Markdown, share a prefilled link, and open the original source URL.
- Use shareable query parameters: `url`, `lang`, `model`, and `words`.

## Current Architecture

- Framework: Next.js 16 App Router with React 19 and TypeScript.
- UI: `src/app/page.tsx` renders `src/components/ScrapeSummarize.tsx`, which composes form, progress, error, and summary views.
- State: `src/store/summarizerStore.ts` stores URL, language, model, word count, extracted text, summary, pending state, progress, and errors.
- Client orchestration: `src/hooks/useSummarizer.ts` coordinates proxy fetches, AI streaming, cancellation, stale-run checks, progress updates, and toasts.
- Server extraction: `src/app/api/proxy/route.ts` validates incoming URLs, follows bounded redirects, pins DNS lookups, blocks private and special-use network targets, limits content size, checks HTML content type, and extracts text with Cheerio.
- AI generation: `src/actions/generateActions.ts` validates inputs with Zod, verifies model availability from environment keys, selects the provider model, and streams text with the Vercel AI SDK.
- Shared limits: `src/constants/app.ts` defines progress steps, timeouts, word count bounds, content size, document length, and redirect limits.

## Validation Evidence

- `npm run lint` is the primary quality gate.
- `npm test` runs Vitest tests for URL validation, private IP detection, and environment-driven model availability.
- `npm run build` is available for production build validation.
- Existing tests cover `src/utils/url-validation.ts`, `src/utils/network.ts`, and `src/lib/model-availability.ts`.

## Operational Constraints

- `.env.local` must remain local and uncommitted. `.env.example` is the public template.
- At least one provider API key is needed for live summarization.
- `/api/proxy` supports HTML pages only and rejects insufficient extracted content.
- Very large documents are truncated before AI summarization at `VALIDATION.MAX_DOCUMENT_CHARS`.
- Fetching is bounded by timeout, content size, redirect count, and private-network restrictions.

## Quality Risks To Track

- The proxy route is security-sensitive because it fetches user-supplied URLs; SSRF and redirect behavior need regression coverage when changed.
- AI generation depends on external provider credentials and network availability, so live provider behavior is not fully covered by local unit tests.
- UI streaming and cancellation rely on run IDs plus abort controllers; async changes should keep stale updates from reaching the current run.
- README includes future roadmap candidates, but this spec treats them as unapproved ideas unless the user explicitly approves product direction.

## Current Improvement Focus

The active codebase-improvement workflow may update current-state documentation, validation notes, tests, safety fixes, package hygiene, dead-code cleanup, and maintainability improvements. It should not create or approve new product roadmap priorities.
