# Web Summarize roadmap

Punchlist after the 28 Oct 2026 maintenance pass on `dev`, with a dependency refresh on 2 Nov 2026. No open GitHub issues or pull requests were filed against this repository at that time. Nothing here is approved work until someone asks for it.

Direct dependencies are on the newest published release. Two holds remain: the root `typescript` package stays on `@typescript/typescript6@6.0.2` (see below), and `minimatch@3.1.5` stays inside `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, and `eslint-plugin-react`. Those plugins call the minimatch 3 default export. The patched line is 11.0.4, which is not that callable export, so forcing it breaks lint. ESLint and typescript-eslint's own minimatch 10 copies are overridden to `11.0.4`. `@grpc/grpc-js` stays overridden, now at `^1.14.7`. `npm audit` still reports the minimatch 3.1.5 finding (moderate). `npm audit fix --force` would downgrade ESLint to 4 and is not applied.

## Next steps

1. Decide whether a public deployment needs a shared quota. The current limiter is in memory on one process. Several instances, or a cold start, do not share counters, so the published per-IP caps are not a global spend cap.
2. `/api/summarize` now requires a verified Firebase user. The proxy route is still public. Decide whether scraping should require the same session.
3. Replace `'unsafe-inline'` in the Content-Security-Policy when the app can serve Next.js scripts with nonces or hashes. Production already omits `'unsafe-eval'`.
4. Remove the TypeScript 6 API alias after typescript-eslint supports the TypeScript 7 API. typescript-eslint 8.72.1 still peers `typescript >=4.8.4 <6.1.0`, so `typescript` stays on `@typescript/typescript6@6.0.2` and `@typescript/native` supplies `tsc` 7.0.2. ESLint fails if the root `typescript` package is 7.
5. Add an optional live provider smoke check outside the default CI gate. The gate uses `SUMMARIZE_USE_FIXTURES=true` so it does not call providers or spend credits.
6. CI runs on Node.js 24. `@types/node` stays on the 26 line and is ahead of that runtime.
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

- `POST /api/summarize` requires a Firebase ID token verified on the server, plus the per-IP and per-user in-memory limits. Those limits still reset per process.
- `POST /api/proxy` is still public.

## Deployment

Vercel project linked Oct 28, 2026 (team `ignitechannel`, project `web-summarize`). Dev previews are at `web-summarize-git-dev-ignitechannel.vercel.app`. Live summaries need at least one AI key, `OPENAI_API_KEY` by default, set in Vercel. Provider keys are set on the dev preview.

Firebase Auth is not provisioned by this repo. Steve still needs Firebase project `websummarize-2026` with Email/Password, email-link, and Google sign-in enabled, authorized domains for localhost and the dev alias, and the `NEXT_PUBLIC_FIREBASE_*` client values set in Vercel before rebuilding the preview. No service-account private key is required.
