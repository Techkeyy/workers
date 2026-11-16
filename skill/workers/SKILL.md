---
name: workers
description: Port a Playwright suite to Kane CLI tests (_test.md) and prove the ported tests catch the same bugs, using mutants (deliberate app breaks). Use when the user asks to port, migrate or convert Playwright tests to Kane, to check that ported Kane tests are as strong as the originals, or to review a Workers report (report.html or report.json). Runs `workers port`, which spends Kane credits, so always dry-run and get approval first.
---

# Workers

Workers ports a Playwright suite to Kane `_test.md` files with a coding agent, then runs both suites against the clean app and against mutants (small deliberate breaks). A test is only good when Kane catches the same bugs as Playwright.

## Prerequisites

Check these before running anything:

- Node 18 or newer.
- `kane-cli` installed and logged in: `kane-cli whoami`.
- Kane credits: `kane-cli balance`. Authoring costs about 40 credits per test.
- A runnable Playwright suite, with a config file and an app that starts (or is already running at `--url`).
- The coding agent CLI logged in: `claude` (run `claude /login` if needed) or `codex` (`codex login`).

## Mutants file

Pass a JSON array with `--mutants`:

```json
[{"id": "B1", "kind": "bug", "description": "...", "file": "app.js", "find": "...", "replace": "..."}]
```

- `id`: short unique name, such as `B1` or `R1`.
- `kind`: `bug` changes behaviour. `refactor` changes markup only (for example a test-id rename) and must keep behaviour the same.
- `file`: path relative to the `--app` directory.
- `find`: must appear exactly once in `file`, or the mutant is refused.
- `replace`: the replacement text.

Examples:

```json
{"id": "B3", "kind": "bug", "description": "Counter always says \"item\" (so \"3 item left\")",
 "file": "app.js", "find": "const itemWord = activeCount === 1 ? 'item' : 'items';",
 "replace": "const itemWord = 'item';"}
```

```json
{"id": "R1", "kind": "refactor", "description": "Counter test-id renamed (same behaviour)",
 "file": "index.html", "find": "data-testid=\"todo-count\"", "replace": "data-testid=\"item-counter\""}
```

Mutants are applied to the app files and reverted afterwards. Commit or stash the app first so a clean revert is easy to confirm.

## Workflow

1. **Dry run first.** It lists the tests, translates nothing on Kane, runs Playwright on every mutant, and prints the plan and a credit estimate:
   ```
   workers port --config <playwright.config> --app <dir> --mutants <file.json> --dry-run
   ```
   Add `--grep` or `--max-tests` to limit scope. The demo is `workers demo --dry-run`.
2. **Ask the user before spending credits.** Show the test count, the mutant count and the credit estimate from the dry run. Wait for a clear yes. Do not run the real port without it.
3. **Run the port:**
   ```
   workers port --config <playwright.config> --app <dir> --mutants <file.json> \
     [--url <app url>] [--out <dir>] [--grep "a|b"] [--max-tests <n>] \
     [--repair-rounds <n>] [--agent claude|codex] [--agent-model <name>]
   ```
   `--out` defaults to `workers-out`. `--repair-rounds` defaults to 2. `--agent` defaults to claude, and falls back to codex if claude is not logged in.
4. **Open the report** at `<out>/report.html`, or read the `headline` block in `<out>/report.json`. Summarise the verdict honestly:
   - bug mutants caught by old and new suites (`bugsCaughtOld` / `bugsCaughtNew`)
   - `kaneWeaker`: bugs Playwright catches and Kane misses. These are real gaps.
   - `kaneFalseAlarms` (`kane-false-alarm`): refactor mutants that Kane fails on. Kane is brittle there.
   - `needsHuman`: tests the repair loop could not fix. A person must look at them.
   - `credits`: Kane credits used this run.
   Say plainly when parity is not reached. Do not round a partial result up to a pass.

## Cell classes

Each test x mutant cell has one of these classes (from `src/parity.js`):

| Class | Meaning |
| --- | --- |
| `ok` | Clean app: Playwright and Kane both pass |
| `old-test-failing` | Playwright fails on the clean app. Mutants are not evaluated for this test |
| `broken-on-clean` | Playwright passes on clean but Kane fails. Needs repair |
| `parity-caught` | Bug mutant: both suites fail (good) |
| `parity-missed` | Bug mutant: both suites pass (neither catches it) |
| `kane-weaker` | Bug mutant: Playwright fails, Kane passes. Needs repair |
| `kane-stronger` | Bug mutant: Kane fails, Playwright passes |
| `parity` | Refactor mutant: both pass |
| `kane-false-alarm` | Refactor mutant: Kane fails although behaviour is unchanged |
| `false-alarm-avoided` | Refactor mutant: Playwright fails, Kane passes (the Kane advantage) |
| `excluded` | Not evaluated, because the clean test failed for the old suite |
| `pw-only` | Kane was not run for this cell |
| `error` | The run itself errored. Investigate, do not count it as a verdict |

## Rules for Claude

- Never edit generated `_test.md` files by hand to make cells green. Fixes come from the Workers repair loop, or the user rewrites the test.
- Never tell the agent which mutant broke what. The agent gets the original test's assertions and Kane's step results only, and the verdict comes from the runs, not from you.
- Always report the credits used (`headline.credits`), and say whether the run was a dry run or a real one.
- Do not spend credits without the user's yes in chat.
