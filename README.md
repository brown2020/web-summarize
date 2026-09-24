# Web Summarize

Enter a public webpage URL and get a streamed AI summary in a chosen language and length. The app fetches and extracts HTML on the server (`/api/proxy`), then summarizes with the Vercel AI SDK across OpenAI, Anthropic, Google, Mistral, and Fireworks models.

## Features

- **URL scrape + extract** — server-side fetch with Cheerio; protocol normalization (`https://` if missing)
- **SSRF-minded proxy** — URL validation, private/special-use IP blocking, DNS pin, bounded redirects, content-type and size limits
- **Multi-model summaries** — GPT-4.1, Claude Sonnet 4.5, Gemini 2.5 Flash, Mistral Large, Llama 3.3 70B (Fireworks); UI only lists models whose env keys are set
- **10 languages** — English, French, Spanish, German, Italian, Portuguese, Chinese, Russian, Hindi, Japanese
- **Target length** — about 10–300 words
- **Streaming UI** — progress for fetch → extract → AI → done; cancel, retry, regenerate
- **Edit extracted text** — tweak the scraped body and regenerate
- **Output actions** — copy, download Markdown, share a prefilled link (`url`, `lang`, `model`, `words`), open source
- **Legal pages** — `/privacy`, `/terms`
- **Fixture mode** — `SUMMARIZE_USE_FIXTURES=true` for CI without burning LLM credits

No Firebase, Stripe, or user accounts.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js `^16.3.6` (App Router; `dev` uses Turbopack) |
| UI | React `^19.2.5`, Tailwind CSS `^4.2.2`, Radix primitives, Lucide, react-hot-toast |
| Language | TypeScript `^6` |
| Scraping | axios `^1.15`, cheerio `^1.2` |
| AI | Vercel AI SDK (`ai` `^6`, `@ai-sdk/*`, `@ai-sdk/rsc`) |
| Validation | Zod `^4` |
| State | Zustand `^5` |
| Tests | Vitest `^4` |
| Lint | ESLint `^10` + `eslint-config-next` |

## Project structure

```
src/
  app/
    page.tsx              # Home (passes available models)
    api/proxy/route.ts    # HTML fetch + text extraction
    privacy/ terms/ error / not-found
  actions/generateActions.ts   # Streaming summarization Server Action
  components/             # ScrapeSummarize, SummarizerForm, ui/*
  hooks/useSummarizer.ts
  store/summarizerStore.ts
  constants/              # languages, model catalog, limits
  lib/                    # model availability, fixtures, utils
  utils/                  # URL validation, private IP helpers
  types/
.env.example
.github/workflows/ci.yml
```

## Getting started

### Prerequisites

- Node.js 22+ (CI uses 22)
- npm
- At least one AI provider API key (unless using fixtures only)

### Clone and install

```bash
git clone https://github.com/brown2020/web-summarize.git
cd web-summarize
npm install
```

### Environment variables

Copy `.env.example` to `.env.local`. **Never commit real keys.** Use placeholders only in docs and examples.

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `OPENAI_API_KEY` | GPT-4.1 | [OpenAI API keys](https://platform.openai.com/api-keys) |
| `ANTHROPIC_API_KEY` | Claude Sonnet 4.5 | [Anthropic Console](https://console.anthropic.com/) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini 2.5 Flash | [Google AI Studio](https://aistudio.google.com/apikey) |
| `MISTRAL_API_KEY` | Mistral Large | [Mistral Console](https://console.mistral.ai/) |
| `FIREWORKS_API_KEY` | Llama 3.3 70B via Fireworks | [Fireworks](https://fireworks.ai/) |
| `SUMMARIZE_USE_FIXTURES` | `true` to return labeled fixtures from proxy + generate (CI) | Set locally / in CI |

Models without a configured key are omitted from the selector (except when fixtures are enabled).

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
| `npm start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run test:watch` | Vitest watch mode |

## Testing and CI

CI (`.github/workflows/ci.yml`) on `dev` / `main` and PRs:

1. `npm ci --ignore-scripts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test` with `SUMMARIZE_USE_FIXTURES=true`
5. `npm run build` with `SUMMARIZE_USE_FIXTURES=true`

Coverage includes URL validation, private-network checks, model availability, fixtures, and the proxy route under fixtures.

## Deployment

Deploy to Vercel or another Next.js host. Set the provider API keys you need in the host environment. No GitHub `homepageUrl` is set for this repository.

## Contributing

1. Develop on `dev`.
2. Treat `/api/proxy` as security-sensitive; keep SSRF tests green when changing fetch behavior.
3. Run lint, typecheck, and tests before pushing.
4. Do not commit `.env.local` or secrets.

## License

[GNU Affero General Public License v3.0](LICENSE.md) (AGPL-3.0).
