# Orchestration Plan

## Mode Selection

- Repo: `/Users/stephenbrown/Code/OPENSOURCE/web-summarize`
- Branch: `dev`
- Work mode: `full`
- Run folder: `/Users/stephenbrown/Code/OPENSOURCE/web-summarize/agent-runs/2026-06-20-codebase-pass`
- Verifiable gates: `npm run lint`, `npm test`, `npm run build`, `npm outdated`, `npm audit --audit-level=moderate`, `git diff --check`, `git push --dry-run origin dev`
- Human-decision blockers: product roadmap changes, broad architecture redesign, risky major dependency migrations, changes requiring live provider credentials beyond local validation
- Resume policy: re-run Git remote read and dry-run push checks, read `run-state.md` and `task-queue.md`, push any validated local phase commit first, then continue the recorded next action

## Loop Plan

| Phase | Loop | Verify Gate | Stop Condition |
| --- | --- | --- | --- |
| Preflight and Repo Docs | Orchestration Planning Loop, Docs Sweep Loop | Docs match current repo and checks pass | Plan, state, queue, docs, and report pushed |
| Baseline Validation | Baseline Validation Loop, Quality Gate Selection Loop | Lint, tests, build, and dependency diagnostics are recorded or failures are classified | Baseline is clean or all failures have evidence and ownership |
| Findings Backlog | Findings Queue Loop, Architecture Fitness Loop, Lean Code Loop | Evidence-backed backlog and scorecard | Backlog, scorecard, and queue are pushed |
| Execute Fixes and Improvements | Task Queue Loop, Fix Validation Loop, Architecture Fitness Loop, Lean Code Loop | Targeted checks plus lint pass for each completed task batch | Highest-priority verifiable fixes are done, deferred, or blocked |
| Package and Dead-Code Cleanup | Package Cleanup Loop, Dead Code Loop | Package diagnostics, lint, tests, and build pass or pre-existing failures are documented | Safe updates/removals are pushed and risky items deferred |
| Review | Judge Loop | Review verdict is PASS or findings are queued | No unqueued P0/P1 issues or unowned changes remain |
| Stabilization Loop | Stabilization Loop, Judge Loop, Reflect-or-Kill Loop as needed | Completion criteria pass or real blocker is documented | Repo is clean/synced with final gate recorded |
| Integrator | Final Completion Gate | Remote read, dry-run push, branch sync, clean tree, and final verification recorded | Final report pushed or exact blocker recorded |

## File Ownership

| Task | Owned Files | Notes |
| --- | --- | --- |
| T-001 | `agent-runs/2026-06-20-codebase-pass/*`, `AGENTS.md`, `SPEC.md` | Startup planning, repo guidance, current-state spec, and preflight report |
| T-002 | `agent-runs/2026-06-20-codebase-pass/02-baseline-validation.md` | Baseline checks and failure classification |
| T-003 | `agent-runs/2026-06-20-codebase-pass/03-findings-backlog.md`, `agent-runs/2026-06-20-codebase-pass/task-queue.md` | Findings backlog and architecture scorecard |
| T-004 | Source/test files identified by findings, execution report, task queue | Small verifiable bug, race, architecture, or lean-code fixes |
| T-005 | `package.json`, `package-lock.json`, proven dead files, cleanup report | Safe dependency and dead-code cleanup |
| T-006 | Review and stabilization reports plus in-scope follow-up fixes | Judge and stabilization cycles |
