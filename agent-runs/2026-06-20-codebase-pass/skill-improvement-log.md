# Skill Improvement Log

| ID | Trigger | What Happened | Skill Root Cause | Proposed Change | Classification | Status |
| --- | --- | --- | --- | --- | --- | --- |
| SI-001 | Startup sync found no local `dev` and no `origin/dev` | The run created local `dev` from `origin/main`, dry-run pushed it, then pushed `origin/dev` so the required dev-branch workflow could continue | The skill requires `dev`/`origin/dev` sync but does not explicitly say whether a missing default branch should be created from the remote default branch or treated as a blocker | Add an explicit missing-`origin/dev` rule: if working tree is clean and the user invoked default full mode, create `dev` from the remote default branch only after remote read succeeds and dry-run push proves branch creation; otherwise stop with exact branch guidance | Propose | Recorded for source workflow review; not applied because branch policy may be organization-specific |

## Applied Updates

- None.

## Source Sync

- Source repo: brown2020/sb-codex-skills
- Commit: None.
- Push status: Not needed.
- Install refresh: Not needed.

## Proposed Future Updates

- Clarify missing-target-branch behavior for `$sb-cbi` startup sync so future runs do not need to infer whether creating `origin/dev` is authorized.
