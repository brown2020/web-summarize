# Web Summarize Current-State Spec

## Purpose

Web Summarize is a Next.js application that accepts a public webpage URL, extracts readable HTML text on the server, and streams an AI summary in a selected language and approximate word count.

## Shipped behavior

- Sign in with Firebase email/password or an email link before using the summarizer. `/signin` is the sign-in page. `/loginfinish` completes an email link. Signed-out visitors see the sign-in form instead of the summarizer.
- Accept a webpage URL with or without a scheme. A missing scheme is normalized to `https://`.
- Reject localhost, embedded credentials, single-label hostnames, and private or special-use addresses before any fetch. Public IPv4 and IPv6 literals are allowed. The same IP checks run in the form and on the server.
- Choose one of ten languages: English, French, Spanish, German, Italian, Portuguese, Chinese, Russian, Hindi, Japanese.
- Choose a model from the catalog entries whose provider key is set: `gpt-4.1`, `claude-sonnet-4.5`, `gemini-2.5-flash`, `mistral-large`, `llama-v3p3-70b`.
- Choose a target length from 10 to 300 words (default 100).
- Show progress at 0, 20, 50, 70, and 100 for start, fetch, extract, AI, and done.
- Cancel the in-flight summary. The browser abort reaches `POST /api/summarize`, which aborts provider streaming. Retry, regenerate, and regenerate from edited extracted text are supported.
- Copy the summary, download Markdown, share a prefilled link, and open the source URL.
- Shareable query parameters: `url`, `lang`, `model`, `words`.
- Legal pages: `/privacy` and `/terms`.

## Request flow

1. `src/components/SummarizerForm.tsx` collects URL, language, model, and word count.
2. `src/hooks/useSummarizer.ts` posts the URL to `/api/proxy`, tracks progress, and ignores stale runs.
3. `src/app/api/proxy/route.ts` accepts POST only. It validates the URL, applies the per-instance proxy limit, resolves DNS with a pinned lookup, blocks private targets, refuses environment proxies, follows at most five redirects with the same checks, accepts only `text/html`, caps the body at 1 MB, and extracts text with Cheerio. Extracted text is capped at 50,000 characters and must be at least 50 characters.
4. The hook posts the extracted document to `/api/summarize` with the caller's abort signal and `Authorization: Bearer` Firebase ID token.
5. `src/app/api/summarize/route.ts` applies the per-IP summary limit, verifies the ID token on the server, applies the per-user limit, and calls `createSummaryResponse` in `src/actions/generateActions.ts`. A missing or invalid token returns 401.
6. Generation validates the body with Zod, checks that the model is in the catalog and configured, and streams text at temperature 0.7. The provider call uses `AbortSignal.any` of the request signal and a 60 second timeout. Fetch timeout is 10 seconds.
7. `src/store/summarizerStore.ts` holds the form, extracted text, summary, progress, pending flag, and error.

`generateActions.ts` is not a server action. Provider keys stay on the server. The Fireworks client is created when that model is selected, from `FIREWORKS_API_KEY`.

The homepage is `force-dynamic`. `getAvailableModels()` reads provider keys on each request. With `SUMMARIZE_USE_FIXTURES=true`, both routes return labeled fixture text and skip live HTTP and live models, after validation and rate limiting. `/api/summarize` still requires a verified user before it returns a fixture.

## Abuse limits

Limits live in `src/constants/app.ts` and are enforced in memory for the current process:

| Route | Window | Per IP | Per-IP in flight | Process in flight |
| --- | --- | --- | --- | --- |
| `POST /api/proxy` | 10 minutes | 60 | 4 | 20 |
| `POST /api/summarize` per IP | 10 minutes | 20 | 2 | 8 |
| `POST /api/summarize` per uid | 10 minutes | 20 | 2 | 8 |

The client key prefers `x-real-ip`. Otherwise it uses the rightmost `x-forwarded-for` hop. Otherwise it is `unknown`. A 429 response includes `Retry-After`. The per-user key is the Firebase uid from the verified ID token. There is no shared limiter across instances.

## Authentication

- Client: Firebase Auth email/password (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`) and email link (`sendSignInLinkToEmail`, `signInWithEmailLink`).
- Server: `verifyFirebaseIdToken` checks the bearer token's RS256 signature against Google's `securetoken` JWKS, and checks issuer, audience, subject, and expiry for `NEXT_PUBLIC_FIREBASE_PROJECTID`.
- Missing project id, missing token, bad signature, or expiry all fail closed with 401 and `Authentication required.`
- The page fetch proxy stays available without a session. Only summary generation requires a user.

## Security responses

- Private or disallowed targets return a fixed client message. Unexpected proxy and provider failures do not return the underlying error text.
- Summary timeout returns a timeout message. A cancelled request returns "Request cancelled."
- Every route sends a same-origin Content-Security-Policy (`script-src` and `style-src` allow `'unsafe-inline'`; `'unsafe-eval'` is added only when `NODE_ENV` is `development`), `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.

## Stack as built

- Next.js 16.4 App Router, React 19, Tailwind CSS 4.
- Typecheck uses the TypeScript 7 CLI. The `typescript` dependency is the TypeScript 6 API package so ESLint can run.
- AI SDK `ai` 7 with `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, and `@ai-sdk/mistral` 4. Fireworks is an OpenAI-compatible client pointed at the Fireworks inference URL. Model IDs above are the ones the app calls.
- Zod 4, Zustand 5, axios 1.21, cheerio 1.2.
- Vitest 5 on Vite 8. ESLint 10 with `eslint-config-next`.

## Validation

- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` are the local gates.
- CI on `dev`, `main`, and pull requests runs those commands. Tests and the CI build set `SUMMARIZE_USE_FIXTURES=true`. The build does not require provider keys.
- Tests: `src/utils/url-validation.test.ts`, `src/utils/network.test.ts`, `src/lib/model-availability.test.ts`, `src/lib/summarize-fixtures.test.ts`, `src/lib/client-ip.test.ts`, `src/lib/rate-limit.test.ts`, `src/app/api/proxy/route.test.ts`, `src/app/api/summarize/route.test.ts`.

## Environment names

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `MISTRAL_API_KEY`, `FIREWORKS_API_KEY`, `SUMMARIZE_USE_FIXTURES`, `NEXT_PUBLIC_FIREBASE_APIKEY`, `NEXT_PUBLIC_FIREBASE_AUTHDOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECTID`, `NEXT_PUBLIC_FIREBASE_STORAGEBUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID`, and `NEXT_PUBLIC_FIREBASE_APPID`. `.env.example` lists them. `.env.local` stays uncommitted. At least one provider key is required for a live summary. Firebase client values are required before a person can sign in.

## Out of scope for this spec

Product ideas that are not built are listed in `roadmap.md`. They are not approved work until someone asks for them.
