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
| Kane avoids false alarms the old suite raises | "Refactor" mutants: same behaviour, different markup | Real runs | Playwright fails and Kane passes on at least 1 refactor mutant | R1: PW FAIL / Kane PASS (spike, hand-written test) | SUPPORTED (re-prove inside the product) |
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
| 3 Vertical slice | One test through translate → baseline → 1 mutant → parity → loop → report | CODE DONE (2635ac9). Kane path unexecuted; blocked on credits |
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

- 2026-11-15, Phase 2(a) ACCEPTED after director re-check.
  - The builder (Sonnet) built `demo/app` (vanilla TodoMVC) plus `demo/tests/demo-todo-app.spec.ts` from create-playwright@1.17.130. **The file is MIT, not Apache.**
  - The director re-ran it: 24/24 pass. `diff` against upstream shows the URL as the only change.
  - Committed as 2446a35.
- 2026-11-15, **Phase 2(b) spike on the local app** (Counter test, hand-written `_test.md`, Kane 0.10.4):
  - **Authoring on clean:**
    - First try failed: Kane **could not read localStorage** ("verification setup repeatedly timed out reading browser storage").
    - **Rule T1:** translate Playwright localStorage checks into the visible behaviour: reload, then verify the items are still listed.
    - Re-authoring step 2 passed. About 25 + 27 credits.

    | Break | Playwright | Kane | Meaning |
    | --- | --- | --- | --- |
    | B1 (bug: count shows completed instead of active) | FAIL | FAIL | **parity** ✅. Heal triggered, but it still failed |
    | R1 (refactor: `data-testid="todo-count"` → `item-counter`) | FAIL | PASS (replay, 0 credits) | **false alarm avoided** ✅. The brittleness story is PROVEN on a real run |
    | B2 (bug: always "items", so "1 items left") | PASS (`toContainText('1')` is loose) | PASS | both miss |

  - **Finding K1: Kane extraction rebuilds the label.**
    - The recorded `code_js` for "Verify the counter reads '1 item left'" is ``const n=Number(strong.textContent); return `${n} item${n===1?'':'s'} left` ``.
    - It reads only the number and **re-creates the grammar itself**, so the assertion can never catch a label or plural bug. Proven by a replay with `--no-adaptive-heal` on B2: passed. Playwright's own read of the DOM on B2 gives "1 items left".
    - This is precisely what Workers' mutation parity exists to expose. **Report it to the Kane team (Slack) and in the README's platform-feedback section.**
  - **Finding K2: a failed run with heal on replaced the recordings.** B1's healed failure set `artifacts.replaced: true`. The next run (B2) had 0 replay decisions, re-authored on the *mutant* (about 49 credits) and committed that version. **Rule M1:** every mutant run uses `--no-adaptive-heal`. A replay miss is then terminal, costs no credits, and commits nothing.
  - **Finding K3:** authoring-mode assertions on the mutant also passed. Kane extracted "1 item left" while the DOM showed "1 items left", which is consistent with K1.
  - **Implication for the core-loop demo:**
    - Use **Playwright test 3** ("append new items", `toHaveText('3 items left')`) against mutant **B3**: singular always (`'item'`), so it renders "3 item left".
    - Playwright catches it. A naive Kane translation should miss it (per K1), giving **kane-weaker**.
    - The agent gets the Playwright error, strengthens the wording, and Kane re-authors. Does it catch B3 after that? **This is the next spike, and it needs credits.**
  - **Credits:** 24.6 left. Spikes are blocked until the 10k arrives.

- 2026-11-15, core-CLI builder (Sonnet) stopped correctly: standalone `claude -p` is not logged in on this machine (the session's auth comes from the host app). Codex CLI is logged in (ChatGPT).
  - **Decision:** two adapters (`--agent claude|codex`). The default is claude, falling back to codex when claude isn't logged in. Codex produces the dev and demo translations until the owner runs `claude /login`.
  - The rubric says "any agent", so both adapters are a Craft plus.

- 2026-11-15, core CLI ACCEPTED as code (commit 2635ac9) after director review:
  - **Director checks:** 56/56 unit tests re-run, parity.js matches design rule 3, run-kane uses `--no-adaptive-heal` for mutants, and the repair prompt excludes the mutant (unit-tested).
  - **Real Playwright mutant table (24 tests):**

    | Mutant | Spec tests broken |
    | --- | --- |
    | B1 | 6 |
    | B2 | 0 |
    | B3 | 1 (test 3, `toHaveText('3 items left')`) |
    | B4 | 2 |
    | B5 | 1 |
    | R1 | 2 |
    | R2 | 0 |

  - **Codex translations:** 3 real ones (model `gpt-5.6-terra`, because the configured default `gpt-6-sol` is rejected by the account).
  - **Rules:** `src/rules.md` rule 2 pre-empts K1 with the wording "exact visible text of X is …". Whether Kane then reads the full text is still unproven.
  - **Unverified:** claude adapter (no standalone login), the real `runKane` spawn, and the Kane half of `port.js`. Report HTML unstyled.
  - **Minor:** test 3's translation repeats the same fact as 4 Verify lines (rule 1 says keep the strictest). Tighten later.

- 2026-11-16: credits. The owner's main account used its 10k in an earlier Kane hackathon. A hackathon organizer (Sparsh Kesari, in Slack) said to "use any other email id to redeem the credits". The owner redeemed 10k on an alt email.
  - **Plan:** `kane-cli login --oauth --profile alt`, then `kane-cli profiles switch alt`.
  - **Pending:** the owner confirms with the organizer whether the hackathon registration should also move to the alt email (scoring gate: "same email on both").

## Open blockers

1. **Credits:** 179 available. Owner to claim the 10k (testmuai.com/kane-cli/#creditOffer) or ask in Slack.
