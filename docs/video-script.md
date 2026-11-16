# Workers: demo video script (DRAFT)

Target: about 2:50, roughly 380 spoken words. Built with the demo-video skill.
Status: DRAFT. Fill the `[SHOP_*]` values from the shop run before recording, then run the Phase 7 checks at the bottom.

**Climax sentence (Scene 4):** *"Workers didn't take the agent's word for it. A real Kane run rejected the first fix."*

---

## Before the first take: staging

| Tab | URL | Pre-state |
| --- | --- | --- |
| A, live site | https://workers-port.vercel.app/ | Scrolled to top. Wait about 2 s for the headline to finish rising before you talk |
| B, real report (demo run) | https://workers-port.vercel.app/report/ | Scrolled to the top verdict |
| C, terminal | an empty folder, for example `C:\workers-video` | `npm install workers-port` already done. Kane logged in (`kane-cli whoami`). Font size large, window wide |
| D, shop report | `examples/shop/workers-out/report.html`, opened from disk or published to the site | Scrolled to the verdict |
| E, npm page | https://www.npmjs.com/package/workers-port | Loaded |

**Checks that would ruin a take:**
- Disk has more than 5 GB free.
- Kane balance has more than 300 credits.
- Codex is logged in.
- Notifications are off.
- No other app is using port 4173.

**Terminal footage:** record a real run of the command in Scene 3 beforehand. It takes about 10 minutes, so speed it up in editing and keep the on-screen timer or say "sped up". Never fake output.

---

## Scene 1 · 0:00–0:20 · Tab A, hero, then scroll to "Rewriting a test suite is slow…"

**On screen**
1. Start on the hero, still.
2. Scroll slowly to the problem section; the 54/100 and 17% numbers count up.

**Say**
> "Teams want off brittle Playwright tests, the kind that break when someone renames a button. Kane CLI tests are plain English. But rewriting a whole suite takes weeks, and nobody trusts an AI rewrite they can't check. TestMu's own survey puts trust in AI-written tests at 54 out of 100."

## Scene 2 · 0:20–0:40 · Tab A, "One line, translated"

**On screen**
1. Scroll to the panel and let the morph play once.

**Say**
> "Workers ports your suite with your coding agent, Claude Code or Codex. Every Playwright assertion becomes a plain-English check. But a test that passes proves nothing. So Workers breaks your app on purpose, and checks that the new tests catch the same bugs as the old ones."

## Scene 3 · 0:40–1:20 · Tab C, terminal (sped-up real run)

**Command (pre-recorded):**

```
npx workers-port demo --grep "append new items" --agent codex --agent-model gpt-5.6-terra
```

**On screen**
1. The translation line.
2. The Playwright matrix across the mutants.
3. The Kane lines per mutant, with the (healed) tags.

Keep a visible "sped up" label.

**Say**
> "Here it is on the bundled TodoMVC app. Workers lists the tests, the agent translates them, and both suites run on the clean app. Then it applies one bug at a time: a broken counter, a delete that removes the wrong items. Old suite and new suite both run against every break, and the bug is undone after each run. This is sped up; a real Kane run takes about a minute."

## Scene 4 · 1:20–2:10 · Tab B, report: matrix, then the repair loop (CLIMAX, longest block)

**On screen**
1. Show the verdict line, then the matrix row "should append new items to the bottom of the list".
2. Scroll to "Repair loop". Show round 1, then round 2.
3. On the climax line: **stop moving the mouse. Say it slowly. One full second of silence after it.**

**Say**
> "On this run, the first Kane translation let one bug through: the counter said '3 item left', and Kane passed it. Playwright caught it. So Workers sent the agent what the old test asserted, never the bug itself, and asked for a stronger test. The agent's first rewrite failed on the clean app, so Workers threw it out. The second rewrite caught the bug."
>
> **"Workers didn't take the agent's word for it. A real Kane run rejected the first fix."**
>
> *(one second of silence)*

**Why stillness matters:** this is the closed loop the judges score. Let them read round 1 and round 2 themselves.

## Scene 5 · 2:10–2:35 · Tab B, R1 column, then Tab D, shop report

**On screen**
1. Point at an R1 cell: "false alarm avoided".
2. Switch to the shop report verdict.

**Say**
> "It also shows why you'd switch. Rename a test id and the old suite fails, though nothing broke for the user. Kane stays green. And it isn't only a toy demo: on a second app, a shop with page objects, fixtures and three spec files, Workers ported [SHOP_PORTED] tests and Kane caught [SHOP_NEW] of the [SHOP_OLD] bugs the old suite caught."

## Scene 6 · 2:35–2:55 · Tab E, npm, then Tab A, quickstart

**On screen**
1. The npm page, then the site quickstart.

**Say**
> "It's on npm as workers-port. The mutants are still hand-written, and one planted bug slipped past both suites; the report says so. Every number you saw comes from a real Kane run."

*(Stop on the last word. No outro card.)*

---

## Do-not-claim list

Don't say any of these:
- "Fully automatic." The mutants are hand-written.
- "Works on any suite." It has been tested on two apps.
- "Fewer lines."
- "Real-time".
- "Kane caught every bug." Say "caught every bug the old suite caught".

Don't call the demo-site break-it section live: it is a replay of a real run.

## Reference table (fact-check before upload)

| Claim | Evidence |
| --- | --- |
| Trust 54/100 | TestMu *State of AI in Quality Engineering 2026* |
| Demo run: 6 tests, 7/7 bug catches, 2 false alarms avoided, 1 repaired, B2 slipped | `workers-out/report.json` (run 2), live `/report/` |
| Round 1 broke on clean, round 2 caught B3 | `report.json` `tests[].loop` |
| A Kane run takes about a minute | run logs (about 80–100 s wall clock) |
| Shop numbers | `examples/shop/workers-out/report.json` (fill in) |
| npm `workers-port` | https://www.npmjs.com/package/workers-port |

## Phase 7 checks (fill in before recording)
- [ ] The spoken word count is about 380 (count after filling in the shop numbers).
- [ ] Every URL returns 200.
- [ ] The on-screen labels match the live site (headings checked 2026-11-16: "Move your Playwright tests to Kane. Prove nothing was lost.", "One line, translated", "Break the app. See who notices.", "When the new test is weaker, the agent rewrites it", "What the real run showed", "Try it on the bundled demo").
- [ ] The shop numbers are taken from the real report.
- [ ] The climax block is the longest.
