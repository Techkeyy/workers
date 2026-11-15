# director.md: Workers

Handover file. Any director can take over from here. Keep it current after every phase.

Last updated: 2026-11-15 (UTC+1 local) by director (Claude Opus 5.5)

## Hackathon gates (from kaneclihack.sh, read 2026-11-15)

| Gate | Requirement | Status |
| --- | --- | --- |
| Deadline | **19 Nov 2026, 11:59 PM IST = 18:29 UTC.** No pushes after | open |
| Repo age | Initialized on or after 12 Nov (commit history checked) | OK: `git init` on 2026-11-15 |
| Required tech | Kane CLI, run from an account registered on testmuai.com with the same email as the registration | Logged in. Kane 0.10.4 |
| Credits | 10k free claimable | **BLOCKER:** account shows 179 available / 11,600 total. Owner must claim, or ask in Slack |
| Submission | Public GitHub repo, About text, 3–5 min YouTube video, optional live URL, **2+ public posts** (HN, X, Reddit, LinkedIn) | open |
| Judges must be able to run it | FAQ | `workers demo` must work from a fresh clone |
| Bars | (1) works end to end, (2) Kane caught or proved something, (3) the agent and Kane talked to each other | open |
| Rubric | Ships 25 / Verified 25 / Closed loop 25 / Craft 25. Ties break on Verified, then Closed loop | open |

Research: `Desktop/skill/idea-research/kanecli-hackathon-idea-research.md` (the idea was called "Ferry" there; the owner renamed it **Workers**).

## Product promise (master director skill §2)

- **PRODUCT:** Workers
- **INTENDED USER:** a developer or QA lead with an existing Playwright suite who wants to move to Kane CLI (plain-English tests that don't break on markup changes)
- **CORE PROBLEM:** rewriting a suite by hand takes weeks, and AI rewrites aren't trusted (TestMu's own survey: trust 54/100, 17% of the AI-testing budget goes to verification)
- **CORE PROMISE:** one command ports the suite to Kane `_test.md` files and **proves** they catch the same bugs as the old suite, using deliberate app breaks (mutants). The coding agent fixes any test that doesn't
- **REAL USER JOURNEY:**
  1. `npx workers port ./tests --app http://localhost:PORT` (or `workers demo` for the bundled app)
  2. Workers lists the Playwright tests (Playwright's own `--list`)
  3. The coding agent (Claude Code headless) writes one `_test.md` per test
  4. Baseline: Playwright and Kane both run on the clean app, and both must pass
  5. Mutants: each mutant is applied to the app, both suites run, the mutant is reverted
  6. Parity diff. Where Kane is weaker, the agent gets the evidence (what the old test asserted plus Kane's step results), rewrites the test, and Workers re-runs it, up to a cap
  7. Report: a matrix of tests × mutants for old vs new, findings, loop log, Kane dashboard links, before/after line counts
- **FINAL OUTCOME:** a folder of committed `_test.md` files plus a report proving equivalence per mutant, honestly marking anything not at parity

**Core Outcome sentence:** *Workers is only genuinely working when a ported Kane suite catches every bug mutant the original Playwright suite catches, verified by real Kane runs on the real app, and any test that falls short has been repaired by the agent from Kane's own result or is honestly marked "needs human".*

## Claim → mechanism → proof ledger

| Claim | Mechanism | Boundary | Required proof | Current proof | Status |
| --- | --- | --- | --- | --- | --- |
| Ported tests catch the same bugs | Mutant matrix: both suites run per mutant, verdicts diffed | Real Playwright and Kane runs; verdicts come from exit codes and `run_end`, never from the agent's word | The demo matrix shows parity on every bug mutant | none | UNPROVEN |
| The agent can't game it with vacuous tests | A test must fail on mutants that the old test catches | Parity diff (deterministic code) | A deliberately vacuous `_test.md` is flagged as weaker | none | UNPROVEN |
| Closed loop: Kane's result fixes the test | Evidence from Kane and Playwright goes into the agent prompt, then a re-run | Re-run verdict | Log: missed → rewrite → caught, on a real mutant | none | UNPROVEN |
| Kane avoids false alarms the old suite raises | "Refactor" mutants: same behaviour, different markup | Real runs | Playwright fails and Kane passes on at least 1 refactor mutant | none | UNPROVEN |
| Re-runs are cheap | `testmd` replay from cache | Kane | Credits per replay of about 0 on clean, and the cost on a mutant measured | Clean replay cost **0 credits** (balance 146.65 before and after). It took 15 s of steps, 83 s wall clock including startup and upload. Mutant replay not yet measured | PROVEN for clean replay; mutant replay pending |

## Key design rules (director decisions)

1. **Verdicts are deterministic.** The parity verdict comes from Playwright's JSON reporter and Kane's `run_end.status` and exit code, never from an LLM (build-process Phase 3: rules decide, the model narrates).
2. **The agent never sees the mutant diff.** On a "Kane weaker" result it gets what the *old test asserted* (the Playwright error and source) plus Kane's step results. That keeps it matching the old test's intent instead of overfitting to the mutant.
3. **Two mutant kinds:**
   - `bug`: behaviour changes. Both suites should fail.
   - `refactor`: markup and test-ids change, behaviour stays the same. Playwright may fail, and Kane should pass. This is the brittleness story.
4. **Translation fidelity:** every Playwright `expect` becomes an explicit "Verify …" line, and `beforeEach` becomes an `@import`ed helper.
5. **Credit discipline:** builders never run Kane in loops without director approval. Iteration cap is 2 rewrites per test.
6. **Keep it simple:** Node 24, ESM, plain JS, `node:test`, no build step, minimal dependencies.
7. **Coding agent:** Claude Code headless (`claude -p`). An adapter interface allows Codex later, which is LATER scope.

## Architecture (one job per file)

```
bin/workers.js        CLI: port | demo | report
src/inventory.js      playwright test --list --reporter=json → [{file, title, line}]
src/translate.js      agent adapter: spec source + title + rules → <slug>_test.md
src/run-playwright.js run one test (grep title) → {passed, error}
src/run-kane.js       kane-cli testmd run --agent → {passed, summary, failingStep, credits, testUrl}
src/mutants.js        load workers.mutants.json; apply (find/replace in app files), revert
src/parity.js         PURE: verdict matrix → per-cell class (parity | kane-weaker | kane-stronger | false-alarm-avoided | broken-on-clean)
src/loop.js           re-prompt on kane-weaker or broken-on-clean, cap 2
src/report.js         report.html + report.json
demo/app/             local TodoMVC with the data-testids the Playwright demo spec expects
demo/tests/           demo-todo-app.spec.ts (from Playwright's `npm init playwright` example, Apache-2.0, attributed)
demo/workers.mutants.json
skill/                Claude Code skill wrapping `workers port`
```

## Scope

- **NOW:** the full journey on the bundled demo app; 4–6 bug mutants plus 1–2 refactor mutants; Claude Code adapter; HTML report; README; skill.
- **NEXT:** run on the user's own repo (generic `--app` and `--start`); `--parallel` via `testrun`.
- **LATER:** Cypress input, agent-generated mutants, a GitHub Action, Codex adapter.
- **DISTRACTION:** a web dashboard or UI beyond the report.

## Phases and status

| Phase | What | Status |
| --- | --- | --- |
| 0 Understand | Research and gates | DONE |
| 1 Define | This file | DONE |
| 2 Feasibility spike | (a) local TodoMVC plus the Playwright spec green locally; (b) one hand-written `_test.md`: author on clean, replay on clean (credits?), replay on a bug mutant (fails?), replay on a refactor mutant (passes?) | IN PROGRESS |
| 3 Vertical slice | One test through translate → baseline → 1 mutant → parity → loop → report | pending |
| 4 Product shell | All tests, CLI UX, progress output, report polish | pending |
| 5 Failure and recovery | Kane auth, no credits, agent failure, Playwright missing, interrupted run (mutants must always revert) | pending |
| 6 Package | npm-installable, `workers demo` from a fresh clone | pending |
| 7 UAT | Owner runs `workers demo` from a fresh clone | pending |
| 8 Submission | README (perfect-readme), video (demo-video), posts, audit (audit-skill, critical-bug), project-edge | pending |

## Feature completion matrix

| Feature | Code | Tests | Real integration | Fresh clone | Owner UAT | Final |
| --- | --- | --- | --- | --- | --- | --- |
| Inventory | - | - | - | - | - | - |
| Translate (agent) | - | - | - | - | - | - |
| Baseline (PW and Kane) | - | - | - | - | - | - |
| Mutants apply/revert | - | - | - | - | - | - |
| Parity diff | - | - | - | - | - | - |
| Repair loop | - | - | - | - | - | - |
| Report | - | - | - | - | - | - |

## Builder log

- 2026-11-15: repo initialized, kane-cli upgraded to 0.10.4. Earlier probe on 0.8.7: one authored run on demo.playwright.dev/todomvc passed, 101 s, 19.1 credits.

- 2026-11-15 spike (b), part 1, on demo.playwright.dev with Kane 0.10.4. The test was a 2-step `_test.md` (add 2 todos, then verify order and counter).
  - **Authoring:** passed. Steps cost 13.7 + 9.8 = 23.5 credits; the balance fell 32.7 (179.4 → 146.6).
  - **Replay:** passed, 2/2 replay decisions, **0 credits**.
  - **Useful NDJSON events:**
    - `test_md_summary` with `overall_status`, `steps.{passed,failed,replay_decisions,author_decisions}` and `adaptive_heal.triggered`
    - `test_md_step_end` with `step_index` and `status`
    - `test_md_done.overall_status`
  - **Risk to check on mutants:** `adaptive_heal`. Kane may "heal" around a break and hide it. Bug mutants must still fail.
  - **Budget:** authoring costs about 25–35 credits per test. The demo spec has about 24 tests, so roughly 700 credits to author them all. **This needs the 10k credits**, or a subset of tests.

## Open blockers

1. **Credits:** 179 available. Owner to claim the 10k (testmuai.com/kane-cli/#creditOffer) or ask in Slack.
