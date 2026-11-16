# Workers

Workers ports your Playwright suite to Kane CLI tests and proves the new tests catch the same bugs, by breaking your app on purpose. When a ported test is weaker, your coding agent rewrites it from Kane's own result.

**[GitHub repo](https://github.com/Techkeyy/workers)** <!-- placeholder until the repo is created -->  · **Demo video: TODO** · **Sample report: TODO**

Teams want off brittle selector tests. Rewriting a suite by hand takes weeks, and nobody trusts an AI rewrite they cannot check. TestMu's own [*State of AI in Quality Engineering 2026*](https://www.testmuai.com/research/state-of-ai-in-quality-engineering.md) puts the median trust in AI-generated tests at 54 out of 100, and finds teams spend 50% of their AI testing budget on generating tests but only 17% on verifying them.

> *"The agent says the new tests are equivalent. Would they actually catch the bug the old ones caught?"*

Workers answers that question with a run, not with the agent's word. Every ported test is checked against deliberate breaks of your app (mutants), side by side with the original Playwright test. **The differentiator: a ported test is only accepted if it catches the same bugs, and it avoids the false alarms the selector tests raise.**

Built for the Kane CLI hackathon.

## Why this exists

Playwright tests pin to selectors and `data-testid`s. A harmless markup change breaks them, so teams look at Kane CLI, where tests are plain English steps. The move is the hard part:

- A hand rewrite is weeks of work.
- An agent rewrite is fast, but a test that passes on the clean app proves nothing. A test that asserts nothing passes too.
- Kane's own recording can also be weaker than it looks (see platform feedback below: it rebuilt "N items left" from a bare number).

What is missing is a check on the port itself. Workers supplies it.

```
   old Playwright test           new Kane test
          |                            |
          +---------- same app --------+
                       |
        clean app: both must pass
        bug mutant:  both must FAIL      <- the new test is as strong
        refactor mutant: Playwright fails, Kane passes   <- the false alarm is gone
```

## What it does

1. **Lists** the Playwright tests (Playwright's own `--list` JSON).
2. **Translates** each test with your coding agent into a Kane `_test.md` in plain English, following `src/rules.md`. Every `expect` becomes an explicit "Verify" line. The agent returns text; Workers writes the files.
3. **Runs Playwright** on the clean app, then on every mutant. Each mutant is applied to the app, the suite runs, and the mutant is reverted (also on errors and Ctrl+C).
4. **Runs Kane**: authors each test on the clean app, then runs it on every mutant with Kane's default self-healing, the way it runs in CI. The test's local recordings are restored from a clean snapshot before and after every run.
5. **Diffs parity** with plain code, no LLM. Verdicts come from Playwright's JSON and Kane's exit code and `run_end` status.
6. **Repairs** weak tests. For each test Kane is weaker on, the agent gets what the old test asserted and what Kane did, rewrites it, and Workers re-runs it, up to 2 rounds. The agent never sees the mutant. A test still weak after the cap is marked "needs human".
7. **Reports** `report.html` and `report.json`: the matrix, findings, repair log with a real line diff, Kane dashboard links, before/after line counts.

Cell classes:

| Class | Meaning |
|---|---|
| `ok` | passes on the clean app in both suites |
| `broken-on-clean` | the Kane test fails on the clean app, so it needs a repair |
| `parity-caught` | bug mutant: Playwright and Kane both fail it |
| `parity-missed` | bug mutant: neither suite fails it (this test does not check that behaviour) |
| `kane-weaker` | bug mutant: Playwright fails it, Kane passes. Repair round |
| `kane-stronger` | bug mutant: Kane fails it, Playwright passes |
| `parity` | refactor mutant: both pass |
| `false-alarm-avoided` | refactor mutant: Playwright fails, Kane passes |
| `kane-false-alarm` | refactor mutant: Kane fails |

The pitch is plain English and no selectors. It is not fewer lines: in run 2 the six `_test.md` files total 116 lines against 79 for the Playwright originals.

## Results: run 2 on the bundled TodoMVC demo

Six tests from Playwright's example spec, 7 mutants (5 bugs B1 to B5, 2 refactors R1, R2), Kane with self-healing on, local recordings restored per run. Source: `workers-out/report.json`.

| | 6 tests, 7 mutants |
|---|---|
| Bugs caught, old suite | 7 |
| Bugs caught, new suite | 7 |
| False alarms avoided | 2 |
| Kane weaker | 0 |
| Needs human | 0 |
| Bugs that slipped past both suites | 1 (B2) |
| Repaired tests | 1 (2 rounds) |
| Kane credits | 389.8 |

Mutants: B1 active count counts completed items, B2 counter always says "items", B3 counter always says "item", B4 "Clear completed" removes active items, B5 Escape saves the edit, R1 counter test-id renamed, R2 extra class on the clear button.

`C` = bug caught by both Playwright and Kane. `.` = both pass (the test does not check that). `A` = refactor, Playwright fails, Kane passes (false alarm avoided). `ok` = both pass on the clean app.

| Test | clean | B1 | B2 | B3 | B4 | B5 | R1 | R2 |
|---|---|---|---|---|---|---|---|---|
| add todo items | ok | . | . | . | . | . | . | . |
| append new items to the bottom (repaired) | ok | C | . | C | . | . | A | . |
| cancel edits on escape | ok | . | . | . | . | C | . | . |
| display the current number of todo items | ok | C | . | . | . | . | A | . |
| remove completed items when clicked | ok | . | . | . | C | . | . | . |
| hidden when there are no completed items | ok | C | . | . | C | . | . | . |

Four of the five bugs (B1, B3, B4, B5) are caught by at least one test in both suites. B2 is caught by neither.

### The repair story

"should append new items to the bottom of the list" asserts `toHaveText('3 items left')`.

- **First translation:** `kane-weaker` on B3 (the counter shows "3 item left"). Playwright caught it, Kane did not. In an earlier run the same test caught B3 first time, so Kane's authoring is not deterministic. That is why the port has to be verified.
- **Round 1:** the agent rewrote the test. The rewrite broke on the clean app (`broken-on-clean`) and was rejected. The agent's word was not trusted, the run was.
- **Round 2:** the agent fixed it, using the wording "exact visible text of the todo counter ... is '3 items left'". Kane re-authored it, caught B3, and every other cell held. Final status `repaired`.

## Quickstart

Prerequisites:

- Node 22 or newer (`engines` in `package.json`)
- Chrome
- `kane-cli` (`npm install -g @testmuai/kane-cli`), logged in, with credits
- `claude` or `codex` CLI, logged in

From npm, in any empty folder (the demo app and its Playwright suite are copied to `./workers-demo`):

```bash
npm install workers-port
npx playwright install chromium

# everything except Kane: list, translate, run Playwright on every mutant, print a credit estimate
npx workers-port demo --dry-run --max-tests 1

# the real run (spends Kane credits)
npx workers-port demo --max-tests 3
```

Or from a clone of this repo:

<!-- quickstart verified on a fresh clone: pending -->

```bash
git clone https://github.com/Techkeyy/workers
cd workers
npm ci
npx playwright install chromium

# everything except Kane: list, translate, run Playwright on every mutant, print a credit estimate
node bin/workers.js demo --dry-run --max-tests 1

# the real run (spends Kane credits)
node bin/workers.js demo --max-tests 3
```

The claude adapter is the default (`--agent claude`, falling back to codex if claude is not logged in and codex is). To use Codex: `--agent codex --agent-model <model>`.

`--grep "title one|title two"` ports only tests whose title contains one of the strings. Run 2 used it to pick the six tests that cover every mutant. Without `--max-tests` or `--grep`, the demo ports the whole 24-test spec.

Credits, as I measured them: about 40 per authored test, 0 per clean replay, 10 to 30 per mutant run where self-healing kicks in. Run 2 cost 389.8 credits for 6 tests.

## Using it on your own project

```bash
node bin/workers.js port --config playwright.config.ts --app ./my-app --mutants workers.mutants.json
```

Options: `--url`, `--out`, `--grep`, `--max-tests`, `--repair-rounds`, `--agent`, `--agent-model`, `--dry-run`. Run `node bin/workers.js --help` for the full list. Run `--dry-run` first.

The mutants file is a JSON array. Each mutant edits one file in `--app` with an exact find and replace, temporarily:

```json
[
  {
    "id": "B3",
    "kind": "bug",
    "description": "Counter always says \"item\" (so \"3 item left\")",
    "file": "app.js",
    "find": "const itemWord = activeCount === 1 ? 'item' : 'items';",
    "replace": "const itemWord = 'item';"
  }
]
```

`kind` is `bug` (behaviour changes, both suites should fail) or `refactor` (markup changes, behaviour stays, Playwright may fail and Kane should pass). The bundled file is `demo/workers.mutants.json`. Originals are kept in `<file>.workers-backup` and restored when the run ends, fails, is interrupted, or at the next startup.

## Claude Code skill

`skill/workers/` lets you say "port my Playwright tests to Kane" inside Claude Code. Install it by copying the folder:

```bash
mkdir -p ~/.claude/skills
cp -r skill/workers ~/.claude/skills/
```

Use `.claude/skills/` instead for a single project, then start a new Claude Code session. See `skill/README.md`.

## How I tried to break it

| Attack | Result |
|---|---|
| The agent sees the mutant and tunes the test to it | It cannot. The repair prompt holds the old test's Playwright error and source plus Kane's step results, never the mutant's id, description, file or diff. A unit test pins this. |
| The agent writes a test that asserts nothing | It has to fail the mutants the old test fails. In run 2, round 1's weaker rewrite of the append test did not survive the runs: it broke on the clean app and was rejected. I have not yet fed Workers a deliberately empty `_test.md`. |
| Kane heals around a bug and passes it | A heal that passes a bug mutant still counts as a miss (`kane-weaker`). A heal that passes a refactor counts as a false alarm avoided, with the heal flagged. |
| Strict replay hides the brittleness story | In strict replay Kane's recorded checks use `data-testid` selectors like Playwright does (R1 was a `kane-false-alarm` with healing off). So Workers runs Kane the way CI does, with self-healing on, and restores the clean recordings before every run. |
| Kane authoring changes between runs | It does. The same test caught B3 in run 1 and missed it in run 2 before repair. That is the case for verifying every port. |
| A bug neither suite catches | B2 ("1 items left") slipped past both suites. It is reported as missed, not hidden. |
| Mutant left in the app after a crash | Reverted on errors and SIGINT, and at next startup. `demo/app` was clean after run 2. |

**A bug-mutant cell is only `parity-caught` when both suites actually failed. Verdicts come from exit codes and JSON, never from the agent.** Rules decide, the agent only writes tests.

The Workers code itself has 71 unit tests (`npm test`, `node --test`), plus the real runs above.

## Architecture

| File | Job |
|---|---|
| `bin/workers.js` | CLI entry: `port` and `demo` |
| `src/port.js` | Orchestrates the full run: translate, baseline, mutants, parity, repair, report |
| `src/inventory.js` | Lists Playwright tests from `--list` JSON |
| `src/translate.js` | Extracts a test's source, asks the agent, validates the `_test.md` |
| `src/rules.md` | The translation rules the agent follows |
| `src/agents.js` | Adapters for claude and codex |
| `src/run-playwright.js` | Parses Playwright results into per-test verdicts |
| `src/run-kane.js` | Runs Kane and parses its NDJSON into a result |
| `src/kane-cache.js` | Snapshots and restores Kane's per-test recordings |
| `src/mutants.js` | Loads, applies and reverts mutants |
| `src/parity.js` | Pure function: verdicts to cell class |
| `src/loop.js` | Builds the repair prompt (no mutant details) and runs the rounds |
| `src/diff.js` | Line-based LCS diff for the repair log |
| `src/report.js` | Renders `report.html` and `report.json` |
| `src/server.js` | Makes sure the app is being served |
| `src/util.js` | Runs child processes |

## Platform feedback for Kane CLI

I built on `kane-cli` 0.10.4 (`testmd run`, NDJSON `--agent` output, `output-<stem>/` recordings, self-healing). Mutation checks turn up things normal use rarely does. These are observations, with evidence from `director.md`; I have not filed them as issues yet.

- **K1, plural label rebuilt in extraction.** The recorded `code_js` for "Verify the counter reads '1 item left'" reads only the number and rebuilds the text: ``const n=Number(strong.textContent); return `${n} item${n===1?'':'s'} left` ``. A replay with `--no-adaptive-heal` on B2 passed, while Playwright's read of the DOM gave "1 items left". So a label or plural bug cannot be caught by that check. Wording like "the exact visible text of X is ..." helps (B3 was caught), and Workers uses it, but the recorded check can still differ between authoring runs.
- **T1, localStorage reads time out.** Authoring a test that verified localStorage failed with "verification setup repeatedly timed out reading browser storage". Workers translates those checks into reload then verify what is visible.
- **K2, a failed healed run replaced the local recordings.** A failed run with healing on set `artifacts.replaced: true` for B1. The next run (B2) had 0 replay decisions and re-authored on the mutant, about 49 credits, committing that version. Restoring `output-<stem>/` from a snapshot fixed it locally (a clean replay after restore cost 0 credits). It would help if a failed run left the recordings alone.

## Limitations

- Mutants are hand-written. Workers does not generate them.
- The claude adapter has not been exercised end to end on this machine. The runs above used codex (model `gpt-5.6-terra`).
- Kane runs sequentially, about a minute each.
- Desktop web only.
- Tests run against a local app.
- One planted bug (B2) slipped past both suites in the demo.

## License

MIT, see [LICENSE](LICENSE). `demo/tests/demo-todo-app.spec.ts` is Playwright's example spec from the `create-playwright` package (version 1.17.130, Microsoft, MIT). Only its URL was changed, see [`demo/tests/NOTICE.md`](demo/tests/NOTICE.md).
