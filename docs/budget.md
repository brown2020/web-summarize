# Runtime budget (stated before measure)

| Operation | Budget | Critical path | Notes |
| --- | --- | --- | --- |
| Home HTML (production) | ≤ 150 KB transfer | `GET /` | First paint document |
| Fixture proxy POST | ≤ 200 ms local | `POST /api/proxy` with `SUMMARIZE_USE_FIXTURES=true` | Excludes live HTTP fetch |
| Fixture summary action | ≤ 500 ms local | `generateSummary` fixtures | Excludes live LLM latency |

Measured during until-100 against production `next start` with fixtures enabled.
