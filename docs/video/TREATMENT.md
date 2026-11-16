# Workers: "Break it on purpose", film treatment

Director: Claude (director and builder, per the owner's handoff of 2026-11-16).
Runtime: **exactly 180.000 s, 30 fps, 5,400 frames**, 1920×1080, H.264 yuv420p, AAC.
Narrator: **ElevenLabs cloned voice "Iszee demo voice"** (the owner's explicit override of the default OpenAI Cedar for this project). Delivery is crisp and cinematic, with no unnatural pauses.
VPS project: `/root/demo-studio/projects/workers/`. Windows output: `C:\Users\HomePC\Desktop\demo videos\Workers_Demo_Final.mp4`.

## Concept
**A comic-book broadsheet about breaking things on purpose.**
- **Look:** newsprint paper `#EFE6D2`, ink `#15120E`, vermilion signal `#FF4A1C`, mustard `#E0A526`, pass green `#2F6B4F`.
- **Type:** Instrument Serif (display), Inter (UI, tabular numbers), JetBrains Mono (labels and code). All are the site's own fonts.
- **Signature motion:**
  - halftone dot fields
  - ink-bordered comic panels that slam in with a spring
  - word-by-word serif headlines
  - the owner's **halftone impact-burst image** (`hero-burst.jpg`) as the impact frame whenever a bug lands
  - a vermilion ticker band
  - camera push-ins on real UI
- **Rule:** motion explains, real footage proves, narration connects. Every product state on screen is either real capture or verbatim output from a real run, labelled as such.

## Story beats and narration (locked text; timings locked from the generated voice)

| # | Beat | Visual | Narration |
|---|---|---|---|
| S1 | COLD OPEN / PROBLEM | A green Playwright test list; a "Buy" button renamed "Purchase"; a red cascade with impact bursts. Kinetic: "Not a bug. A rename." | "A designer renames one button. The app still works. But your Playwright suite turns red. It isn't catching bugs. It's catching renames." |
| S2 | STAKES | Kane plain-English line types out. Stat panels count up: **54/100** trust, **17%** of budget on verifying (source line: TestMu, State of AI in Quality Engineering 2026). | "So teams look at Kane CLI, where a test is plain English. But rewriting a whole suite takes weeks. And an AI rewrite? TestMu's own survey puts trust in AI-written tests at fifty-four out of a hundred." |
| S3 | SOLUTION REVEAL | An impact burst slams in; "WORKERS" stamps in; tagline. Then the real Playwright line morphs into the real Kane line ("One line, translated"). | "Meet Workers. It moves your Playwright suite to Kane, and proves nothing was lost. Selectors go in. A sentence anyone can read comes out." |
| S4 | MECHANISM | Animated diagram as comic panels: suite, then agent (Claude Code / Codex), then both suites on the clean app, then BREAK (B1 counter lies, B4 wrong delete), then side-by-side verdicts. Callout: "the agent never sees the bug". | "Here's how. Your coding agent, Claude Code or Codex, translates every test. Both suites run on the clean app. Then Workers breaks the app on purpose, one bug at a time. A counter that lies. A delete that removes the wrong thing. Old suite and new suite, side by side, against every break." |
| S5 | REAL PROOF: THE RUN | A floating terminal replays the **verbatim** console output of run 2 (16 Nov), sped up, labelled "real output, replayed". Push-ins on `FAIL (healed)` and `pass`. A cut to the real-browser capture of the live demo app breaking (B3). | "This is a real run on Playwright's own TodoMVC example. Six tests, seven deliberate breaks, every Kane run real. Kane runs with self-healing on, exactly like CI, and Workers restores the clean recordings before every run, so one break can't leak into the next." |
| S6 | THE VERDICT | Real browser capture of `/report/`: verdict sentence, tiles, matrix scroll. Push-in on an R1 cell, "false alarm avoided". | "The verdict: Kane caught every bug the old suite caught, seven of seven. And it avoided two false alarms, because a renamed test id is not a bug your users can see." |
| S7 | **CLIMAX: THE REPAIR LOOP** (longest block) | A comic 3-panel strip built from the real loop log: panel 1 "Kane passed '3 item left'" (vermilion burst), panel 2 the agent rewrite, REJECTED stamp ("broke on the clean app"), panel 3 the second rewrite, CAUGHT stamp. Then a real capture of the report's repair log. **Hold still on the climax line; about a 0.8 s breath after it.** | "But this is the part that matters. On this run, the first Kane translation let one bug through. The counter said three item left, and Kane passed it. Playwright caught it. So Workers sent the agent only what the old test asserted, never the bug, and asked for a stronger test. The first rewrite failed on the clean app, so Workers threw it out. The second one caught the bug. Workers didn't take the agent's word for it. A real Kane run rejected the first fix." |
| S8 | REAL SUITE | Real shop app capture (Inkwell Supply). Code panel of the real page object, then the real generated `_test.md` (login expanded, `Add Fountain Pen to cart`). Shop verdict numbers. | (filled from the shop run) "And it isn't only a toy. On a second app, a shop with page objects, fixtures and three spec files, Workers ported {N} tests, and Kane caught {X} of the {Y} bugs the old suite caught." |
| S9 | HONEST CLOSE | Ticker band; npm line `npx workers-port demo`; site URL; final title card. | "It's honest about its limits. The breaks are still hand-written, and one planted bug slipped past both suites. The report says so. Workers is on npm today. Break it on purpose. Prove nothing was lost." |

## Feature coverage ledger

| Feature (implemented) | Scene |
| --- | --- |
| Playwright inventory (`--list`) | S5 terminal |
| Agent translation (Claude Code / Codex), rules (every expect becomes a Verify) | S3, S4 |
| Imported page objects and fixtures sent to the agent | S8 |
| Playwright run per mutant, apply/revert safety | S4, S5 |
| Kane authoring plus self-healing, per-run cache restore | S5 |
| Parity classes (caught, missed, weaker, stronger, false alarm avoided) | S6 |
| Repair loop, agent never sees the mutant, rejected rewrite | S7 |
| HTML report | S6, S7 |
| Dry run plus credit estimate | S9 (terminal line) |
| npm package `workers-port`, `workers demo` copies itself out | S9 |
| Claude Code skill | S4 or S9 chip |
| Live site | S9 |

**Not claimed:** automatic mutant generation, "works on any suite", fewer lines, live demo-site runs.

## Claim ledger
- **S2 survey numbers:** the TestMu report URL. PROVEN.
- **S5 "real run, 6 tests, 7 breaks":** `$TEMP/run2.log` and `workers-out/report.json`. PROVEN.
- **S6 7/7 and 2 false alarms:** `report.json` headline. PROVEN.
- **S7 loop:** `report.json` `tests[1].loop` (round 1 `broken-on-clean`, round 2 B3 `parity-caught`). PROVEN.
- **S8:** the shop `report.json`. PENDING the run.
- **S9 B2 slipped:** `report.json`. PROVEN.
