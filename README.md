# Web Summarize

Enter a public webpage URL and get a streamed AI summary in a chosen language and length. The app fetches and extracts HTML on the server (`POST /api/proxy`), then summarizes through `POST /api/summarize` with the Vercel AI SDK. Providers are OpenAI, Anthropic, Google, Mistral, and Fireworks. Model IDs are fixed in the catalog and are not selected from the environment.

## Features

- **URL scrape + extract** — server-side fetch with Cheerio; a missing protocol is normalized to `https://`
- **SSRF protections** — URL validation, private and special-use IP blocking (including IPv4 embedded in 6to4, NAT64, and Teredo), DNS pinning, `proxy: false`, bounded redirects, HTML content-type and size limits
- **Multi-model summaries** — GPT-4.1, Claude Sonnet 4.5, Gemini 2.5 Flash, Mistral Large, Llama 3.3 70B (Fireworks). The selector lists only models whose provider key is set
- **10 languages** — English, French, Spanish, German, Italian, Portuguese, Chinese, Russian, Hindi, Japanese
- **Target length** — about 10–300 words
- **Streaming UI** — progress for fetch, extract, AI, and done. Cancel aborts the summary request. Retry and regenerate are available, including regenerate from edited extracted text
- **Sign-in** — Firebase email/password and Google sign-in. An email link is also available. `/api/summarize` requires a Firebase ID token verified on the server
- **Per-instance abuse limits** — `/api/proxy`: 60 requests / 10 minutes and 4 in flight per IP (20 in flight for the process). `/api/summarize`: the same 20 requests / 10 minutes and 2 in flight, applied per IP and again per signed-in user (8 in flight for the process on each limiter)
- **Output actions** — copy, download Markdown, share a prefilled link (`url`, `lang`, `model`, `words`), open the source page
- **Response headers** — Content-Security-Policy, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`
- **Legal pages** — `/privacy`, `/terms`
- **Fixture mode** — `SUMMARIZE_USE_FIXTURES=true` returns labeled fixture text and skips live fetch and live model calls

No Stripe. Accounts are Firebase Auth only.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js `^16.4.3` (App Router; `dev` uses Turbopack) |
| UI | React `^19.3.1`, Tailwind CSS `^4.3.3`, Radix primitives, Lucide, react-hot-toast |
| Language | TypeScript 7.0 CLI (`@typescript/native`) with the TypeScript 6.0 API (`typescript` aliased to `@typescript/typescript6`) so ESLint can load |
| Scraping | axios `^1.21.0`, cheerio `^1.2.0` |
| AI | Vercel AI SDK (`ai` `^7.0.156`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/mistral`) |
| Validation | Zod `^4.6.7` |
| State | Zustand `^5.0.16` |
| Auth | Firebase Auth (`firebase`) — email/password and Google |
| Tests | Vitest `^5.0.5` on Vite `^8.3.5` |
| Lint | ESLint `^10.13.0` + `eslint-config-next` |

`npm run typecheck` runs TypeScript 7 (`tsc`). ESLint and Next's programmatic checker import the TypeScript 6 API package. Installing only `typescript@7` breaks `npm run lint` until typescript-eslint supports the TypeScript 7 API.

## Project structure

```
src/
  app/
    page.tsx                 # Dynamic home, gated by sign-in
    signin/page.tsx          # Email/password and Google sign-in
    loginfinish/page.tsx     # Completes an email sign-in link
    api/proxy/route.ts       # HTML fetch + text extraction
    api/summarize/route.ts   # Signed-in, rate-limited summary stream
    privacy/ terms/ error / not-found
  actions/generateActions.ts # Provider selection and summary streaming
  components/                # ScrapeSummarize, SummarizerForm, ui/*
  hooks/useSummarizer.ts
  store/summarizerStore.ts
  constants/                 # languages, model catalog, limits
  lib/                       # model availability, fixtures, rate limit, client IP
  utils/                     # URL validation, private IP helpers
  types/
.env.example
.github/workflows/ci.yml
SPEC.md
roadmap.md
```

## Getting started

### Prerequisites

- Node.js 24 (CI uses 24)
- npm
- At least one provider API key for live summarization. Fixture mode does not need keys

### Clone and install

```bash
git clone https://github.com/brown2020/web-summarize.git
cd web-summarize
npm install
```

### Environment variables

Copy `.env.example` to `.env.local`. Never commit real keys. Names only:

| Name | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | GPT-4.1. [OpenAI API keys](https://platform.openai.com/api-keys) |
| `ANTHROPIC_API_KEY` | Claude Sonnet 4.5. [Anthropic Console](https://console.anthropic.com/) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini 2.5 Flash. [Google AI Studio](https://aistudio.google.com/apikey) |
| `MISTRAL_API_KEY` | Mistral Large. [Mistral Console](https://console.mistral.ai/) |
| `FIREWORKS_API_KEY` | Llama 3.3 70B via Fireworks. [Fireworks](https://fireworks.ai/) |
| `SUMMARIZE_USE_FIXTURES` | Set to `true` to return labeled fixtures from the proxy and summarize routes |
| `NEXT_PUBLIC_FIREBASE_APIKEY` | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTHDOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECTID` | Firebase project id. The server checks ID tokens against this project |
| `NEXT_PUBLIC_FIREBASE_STORAGEBUCKET` | Firebase storage bucket (client config only) |
| `NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID` | Firebase messaging sender id (client config only) |
| `NEXT_PUBLIC_FIREBASE_APPID` | Firebase web app id |

Sign-in stays off until the Firebase client values are set. `/api/summarize` still returns 401 until a token verifies for `NEXT_PUBLIC_FIREBASE_PROJECTID`. No Firebase private key is used.

The homepage and model checks read these at request time. A missing key hides that model. With fixtures enabled, every catalog model is listed and no provider is called. Provider clients are created when a summary runs, so `npm run build` succeeds with no keys set.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
SUMMARIZE_USE_FIXTURES=true npm test
SUMMARIZE_USE_FIXTURES=true npm run build
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js + Turbopack |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 7 `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run test:watch` | Vitest watch mode |

## Testing and CI

CI (`.github/workflows/ci.yml`) runs on pushes to `dev` and `main`, and on pull requests:

1. `npm ci --ignore-scripts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test` with `SUMMARIZE_USE_FIXTURES=true`
5. `npm run build` with `SUMMARIZE_USE_FIXTURES=true`

Tests cover URL validation, private-network checks, model availability, fixtures, client IP selection, the in-memory rate limiter, the proxy route, and the summarize route.

## Deployment

Deploy to Vercel or another Next.js host. Set the provider key names you need in the host environment. Rate limits are per server process, not a shared store across instances. This repository does not set a GitHub `homepageUrl`.

## Contributing

1. Develop on `dev`. Promotion to `main` is separate.
2. Treat `/api/proxy` as security-sensitive and keep the SSRF tests green when fetch behavior changes.
3. Run lint, typecheck, and tests before pushing.
4. Do not commit `.env.local` or secret values.
5. Do not change catalog model IDs unless a provider has retired that ID.

## License

[GNU Affero General Public License v3.0](LICENSE.md) (AGPL-3.0).
