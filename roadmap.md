# Web Summarize roadmap

Punchlist after the 28 Oct 2026 maintenance pass on `dev`. No open GitHub issues or pull requests were filed against this repository at that time. Nothing here is approved work until someone asks for it.

## Next steps

1. Decide whether a public deployment needs a shared quota. The current limiter is in memory on one process. Several instances, or a cold start, do not share counters, so the published per-IP caps are not a global spend cap.
2. Decide whether live summarization should require a caller credential. The app has no accounts. Anyone who can reach the deployment can use the configured provider keys up to the per-instance limit.
3. Replace `'unsafe-inline'` in the Content-Security-Policy when the app can serve Next.js scripts with nonces or hashes. Production already omits `'unsafe-eval'`.
4. Remove the TypeScript 6 API alias after typescript-eslint supports the TypeScript 7 API. Until then, `typescript` must stay on `@typescript/typescript6`, and `@typescript/native` supplies `tsc` 7. ESLint fails if the root `typescript` package is 7.
5. Add an optional live provider smoke check outside the default CI gate. The gate uses `SUMMARIZE_USE_FIXTURES=true` so it does not call providers or spend credits.
6. Keep CI on Node.js 22 until a runtime bump is requested. `@types/node` is on the 26 line and is ahead of that runtime. Do not bump the CI Node version as a drive-by.
7. Keep catalog model IDs unchanged unless a provider retires one. DeepSeek is not a catalog model. Adding it is a product change, not a dependency bump.

## Known limitations

- Rate-limit state is not durable and is not shared across processes.
- Fixture mode checks validation, routing, and the UI path. It does not measure live provider quality, latency, or billing.
- Provider and unexpected fetch failures are logged by error name only. There is no error-reporting service.
- A summary concurrency slot is released when the stream finishes, is cancelled, or fails before the response is committed. A process recycle clears every slot.
- The form and the server both reject private addresses. Client checks are for feedback. The server checks are the security boundary.
- Build and tests are safe with no secrets. Live summaries still need at least one provider key in the host environment.

## Known bugs

No confirmed open bug in the current `dev` tree. `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` are the checks for a regression.

## Open issues

No open GitHub issues and no open pull requests.

## Deployment

Vercel project linked Oct 28, 2026 (team `ignitechannel`, project `web-summarize`). Dev previews are at `web-summarize-git-dev-ignitechannel.vercel.app`. Live summaries need at least one AI key, `OPENAI_API_KEY` by default, set in Vercel. That key is not set yet.
