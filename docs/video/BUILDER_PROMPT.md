# MASTER BUILDER PROMPT: Workers demo film ("Break it on purpose")

You are the VIDEO BUILDER. The director wrote this prompt and will review your evidence. Execute it end to end and report in the required format.

## 0. Ground rules
- **SSH alias** `canned-vps`. Studio: `/root/demo-studio`. Project: `/root/demo-studio/projects/workers/` (already created; assets uploaded).
- **The VPS has 1 CPU and about 3 GB free disk.** Check `df -h /` before heavy steps. Delete only your own intermediate files under the project. Never touch other projects or services (Counter, VILLA, BreakFix, CLINCH, Caddy, Docker). No public ports: serve the local apps on `127.0.0.1` only. Do not reinstall tools; verify they work.
- **Reuse the proven pipeline** from `projects/twitch-assist/motion`: `node_modules` symlink to `/root/demo-studio/motion/node_modules`, `remotion.config.ts` (Chromium headless shell path), the FontGate pattern, chunked render script, `theme.ts` helpers. Copy what you need into `projects/workers/motion/`. Never edit twitch-assist.
- **Long jobs** (renders, captures): run with `nohup … &` on the VPS and poll a status file sparingly. A disconnect must not kill a render.
- **No API keys are needed:** all audio is already generated. Never print or store any key.
- **Never fabricate product states.** Product UI comes from real capture. Terminal text is verbatim from `assets/data/run2.log`. Code panels are verbatim from the real files. Explanatory diagrams are clearly diagrams.

## 1. Output spec
1920×1080, 16:9, **30 fps, exactly 5,400 frames (180.000 s)**, H.264 yuv420p, AAC 48 kHz stereo. Plus a matching `.srt`.
- VPS master: `/root/demo-studio/projects/workers/output/Workers_Demo_Final.mp4` (and `.srt`).
- Windows copy: `C:\Users\HomePC\Desktop\demo videos\Workers_Demo_Final.mp4` (and `.srt`), transferred with `scp canned-vps:… "C:/Users/HomePC/Desktop/demo videos/"` from the Windows side, then compare SHA-256 on both sides.

## 2. Read first
- `assets/data/TREATMENT.md`: the creative concept, beats and feature and claim ledgers. **This prompt plus the treatment are the spec.**
- `audio/script.json`: the exact narration text per scene.

## 3. Product facts (all verified, from real runs)
- Workers ports a Playwright suite to Kane CLI `_test.md` tests with a coding agent (Claude Code or Codex).
- It breaks the app on purpose (mutants), runs old and new suites on every break, and compares the verdicts.
- Where Kane is weaker, the agent gets what the old test asserted (never the mutant) and rewrites the test; this repeats up to 2 rounds.
- npm: `workers-port`. Site: https://workers-port.vercel.app. Real report: https://workers-port.vercel.app/report/
- **Run 2 (16 Nov 2026), TodoMVC demo** (`assets/data/report.json`):
  - 6 tests, 7 mutants (B1–B5 bugs, R1–R2 refactors)
  - bug catches old 7 / new 7
  - false alarms avoided 2 (R1)
  - kane-weaker 0 at the end, needs-human 0
  - 1 bug (B2 "1 items left") slipped past both
  - 389.8 credits
- **The repair loop** on "should append new items to the bottom of the list":
  - Initially kane-weaker on B3 ("3 item left": Kane passed, Playwright failed).
  - Round 1: the agent's rewrite was `broken-on-clean`, so it was rejected.
  - Round 2: B3 `parity-caught`, status repaired.
  - The `change` diffs are in `report.json` `tests[1].loop`. The final test is `assets/data/append_test.md`.
- **The real one-line translation:**
  - Playwright: `await expect(todoCount).toHaveText('3 items left');`
  - Kane: `Verify the exact visible text of the todo counter in the footer is "3 items left".`

## 4. Brand
The site's own identity: comic-book newsprint broadsheet.

| Token | Value |
| --- | --- |
| Paper | `#EFE6D2` |
| Paper 2 | `#E4D8BF` |
| Card | `#F8F2E3` |
| Ink | `#15120E` |
| Vermilion | `#FF4A1C` (text-safe darker `#D83A0F`) |
| Mustard | `#E0A526` |
| Pass green | `#2F6B4F` |
| Muted | `#4B4337` |

- **Fonts** (`assets/fonts`): Instrument Serif (display, the italic for emphasis words), Inter variable (UI, `tabular-nums`), JetBrains Mono variable (labels, code, terminal).
- **Panels:** 3–4 px ink borders, hard offset shadow `10px 10px 0 ink`, tilted caption tags (vermilion or mustard, mono, uppercase), halftone dot fields (radial-gradient), and the vermilion ticker band "BREAK IT → SEE WHO NOTICES → REPAIR THE TEST → PROVE IT →".
- **Signature impact frame:** the owner's halftone burst image `assets/hero-burst.jpg` (black halftone on white; use `mix-blend-mode: multiply` on paper). It slams in (scale 0.6 to 1.08 to 1, rotate -8° to 0, 6–8 frames, a small camera shake) **every time a bug lands or a big reveal happens**. Also use it in vermilion: CSS `filter` / mask to tint it, or a duotone canvas.
- Not a generic dark-tech look. No stock imagery.

## 5. Locked timeline (30 fps). Voice start frames are exact; the score is one continuous file.

| Scene | Frames | Seconds | Voice file @ start frame | Visual direction |
| --- | --- | --- | --- | --- |
| S1 COLD OPEN | 0–345 | 0–11.5 | `S1.mp3` @ 90 | 0–90: illustration. A green test list ticking pass, a "Buy" button morphs to "Purchase", then a cascade of red FAIL rows with a glitch and impact bursts. A tag "ILLUSTRATION" in a corner. Kinetic serif on the final line: "Not a bug. *A rename.*" |
| S2 STAKES | 345–900 | 11.5–30 | `S2.mp3` @ 357 | A Kane plain-English line types out (mono, typewriter SFX). Then two stat panels slam in and count up: **54/100** "trust in AI-written tests" and **17%** "of AI testing budget spent checking the work", with the source line "TestMu AI, State of AI in Quality Engineering 2026". |
| S3 REVEAL | 900–1245 | 30–41.5 | `S3.mp3` @ 966 | Frame 900: impact_big, a full-frame burst, then a "WORKERS" serif title (huge), a vermilion italic tagline "Prove nothing was lost.", and the ticker band. Then the real one-line morph (Playwright code panel, arrow, Kane panel). |
| S4 MECHANISM | 1245–1905 | 41.5–63.5 | `S4.mp3` @ 1257 | A comic-panel diagram that builds with the narration: Playwright suite, then agent chip (Claude Code / Codex), then a `_test.md` page ("every expect becomes a Verify line"), then both suites on the CLEAN app (2 green ticks), then BREAK panels "B1 counter lies" and "B4 delete removes the wrong items" with bursts, then side-by-side verdict columns. A callout "the agent never sees the bug". Label: "HOW IT WORKS" (diagram). |
| S5 REAL RUN | 1905–2580 | 63.5–86 | `S5.mp3` @ 1917 | A floating terminal window (3D tilt, soft shadow on paper) replays **verbatim lines** from `run2.log`, sped up, with a tag "REAL OUTPUT · RUN OF 16 NOV 2026 · REPLAYED". Show "Listing Playwright tests… Found 24 tests, selected 6", the Playwright matrix, then the "Kane: running against mutant …" blocks with `FAIL (healed)` pulsing vermilion and `pass` green. Push-ins. Intercut 2–3 s of the **real TodoMVC app with B3 applied** (captured) showing "3 item left", with a burst. Callout: "self-healing on · clean recordings restored before every run". |
| S6 VERDICT | 2580–3015 | 86–100.5 | `S6.mp3` @ 2592 | **Real browser capture** of `/report/` in a floating browser frame: the verdict sentence, the tiles, a matrix scroll, then a push-in on an R1 "false alarm avoided" cell. Callout on a "run" link: "every cell links to the real Kane run". |
| S7 CLIMAX: REPAIR LOOP | 3015–3900 | 100.5–130 | `S7.mp3` @ 3027 | **The longest block.** A comic 3-panel strip, each panel slamming in on its line: (1) "Kane passed '3 item left'" with a vermilion burst; (2) "Agent rewrite #1" showing the real round-1 diff lines, then a "REJECTED · broke on the clean app" stamp (stamp_reject); (3) "Agent rewrite #2" showing the real final Verify line, then a "CAUGHT" stamp (stamp_caught). Then cut to the real capture of the report's Repair loop section. On the final sentence (it starts about 3.4 s before the voice ends; find it from the audio): **everything goes still**, a slow push only, with the kinetic serif line "A real Kane run rejected the first fix." Hold through the breath. Align a big hit with the score's climax hit (find it in the score's loudness envelope near 126–129 s). |
| S8 REAL SUITE | 3900–4620 | 130–154 | `S8.mp3` @ 3912 (**the director uploads it later**) | Real capture of the Inkwell Supply shop (`assets/shop`, serve on 127.0.0.1:4174): login with demo@inkwell.test / inkwell-demo, add Fountain Pen, cart, coupon INK10. A code panel of the real `tests/pages/ShopPage.ts` `addToCart`, an arrow, the real generated `_test.md` line "Click the \"Add Fountain Pen to cart\" button" (the director uploads `assets/data/shop_test.md` and `assets/data/shop.json` with the numbers). Stat tiles from `shop.json`. |
| S9 CLOSE | 4620–5400 | 154–180 | `S9.mp3` @ 4632 | An honest-limits line with small mustard tags ("hand-written breaks", "1 bug slipped past both"). The terminal line `npx workers-port demo --dry-run` types out, then the credit-estimate line. A chip "Claude Code skill included". From frame 5265: the final title card "WORKERS", "Break it on purpose. Prove nothing was lost.", `workers-port.vercel.app`, `npm i workers-port`. A burst hit synced to the score's final hit. Hold to 5400. |

**Pacing:** compositions evolve every 2–5 s. Real UI stays readable (hold a push-in at least 1.5 s on anything the narration names). Transitions are whip-pans, paper slides and mask wipes along panel borders. No slideshow fades.

## 6. Captures (Playwright on the VPS, Chromium from `/root/demo-studio/.cache/ms-playwright`, 1920×1080, `recordVideo` or a frame sequence, deviceScaleFactor 1)
- **C_REPORT:** https://workers-port.vercel.app/report/. Top verdict, tiles, matrix scroll, the R1 cell, the Repair loop section.
- **C_SITE (optional garnish):** https://workers-port.vercel.app/ hero and the break-it demo clicking B3 then R1.
- **C_TODO_B3:** copy `assets/todo` to `raw/todo-b3/`, apply mutant B3 from `assets/todo/workers.mutants.json` with the exact find/replace, serve on 127.0.0.1:4173, add 3 todos and show the counter "3 item left". Also capture the CLEAN copy showing "3 items left" for contrast.
- **C_SHOP:** serve `assets/shop/app` via `assets/shop/serve.js` on 127.0.0.1:4174 and capture the flow listed in S8.
- Kill every local server afterwards.

Use the existing `scripts/capture.mjs` / `run-demo.mjs` where they fit, or a small project-local Playwright script.

## 7. Audio mix (ffmpeg, after a muted Remotion render; same approach as twitch-assist)
- **Voice:** `audio/voice/S*.mp3` placed at the exact frames above. Light compression, -16 LUFS integrated for the voice bus, no clipping.
- **Score:** `audio/score/score_v1.mp3` from 0. Duck about 12 dB under the voice with a smooth sidechain or envelope; let it breathe at full level in the music-only beats (0–3 s, about 28.4–32 s, the title hit at 30 s, the S5 tail, the S7 post-climax breath, the final card).
- **SFX** (`audio/sfx`): impact (bursts), impact_big (frame 900 and the final card), stamp_reject and stamp_caught (S7), whoosh and whoosh_soft (transitions), type (typing), blip (terminal lines, sparingly), glitch_red (S1 cascade), riser (into S3 and into the climax line), press (the title card). Purposeful, not on every cut.
- **Final loudness** about -14 LUFS integrated, true peak ≤ -1 dBTP.
- **Pause check:** run `silencedetect` on the final narration bus. There must be no unintended silence inside any scene's narration. The gaps between scenes are covered by the score and SFX. Then extract the final mix from the MP4 and check the voice is clearly above the music in every scene. Report the measured numbers.

## 8. Captions
Sentence-level captions synced to the voice. Find sentence boundaries per file with `silencedetect` at a low threshold (for example `-35dB:d=0.12`), map them to `script.json` sentences, and offset by the scene start. Burn them in at the bottom in Inter 600 on an ink strip, max 2 lines, and write the `.srt`. The captions must match the spoken words exactly.

## 9. Render
- Chunked muted render (like twitch-assist `render-chunks.sh`, about 6–8 chunks, `--concurrency=1`, crf 17, yuv420p), concatenated, then mux the audio.
- **Before the full render:** render about 12 stills (one per scene plus the climax), check them, and fix what's off. Then a low-res preview of S7 only.
- Keep each chunk; skip finished chunks on re-run.

## 10. QA (report every item with measured values)
- Duration exactly 180.000 s and **5,400 frames** (ffprobe `-count_frames`), 1920×1080, 30 fps CFR, h264 yuv420p, AAC.
- A full decode with no errors.
- Visual check: extract frames every 5 s plus the climax frames and look at them. Text must be readable, nothing must overflow, and the brand must hold.
- Smoothness: no repeated or dropped frames in the motion (check the chunk seams).
- Audio: the voice is intelligible over the score everywhere; loudness numbers; the pause check.
- The captions match the narration.
- No credentials appear on screen (the demo shop password is a fake demo value and may appear only in the shop's own field, typed).
- Feature coverage per the treatment ledger.

## 11. Stop conditions
- STOP and report if a capture site is unreachable, disk drops below 800 MB, the Remotion bundle fails twice for the same reason, or **`audio/voice/S8.mp3` or `assets/data/shop.json` is missing when you reach the final render** (build everything else, render the stills, and wait).
- Do not change the narration text or the voice.

## 12. Final report format
PROJECT / SOURCE REPOSITORY / ACTUAL PRODUCT VERIFIED / FEATURE COVERAGE / REAL FOOTAGE USED / EVIDENCE-CLAIM LEDGER / CINETIC STATUS / REMOTION STATUS / VOICEOVER AND VOICE / VOICEOVER PAUSE CHECK / FINAL AUDIO LISTENING / MUSIC-SOUND DESIGN / CAPTION SYNCHRONIZATION / FINAL DURATION / FRAME COUNT / RESOLUTION / FRAME RATE / VIDEO CODEC / AUDIO CODEC / MOTION SMOOTHNESS / FULL DECODE / VISUAL QA / FINAL VPS FILE / FINAL WINDOWS FILE / TRANSFER VERIFICATION / UNPROVEN OR OMITTED FEATURES / BLOCKERS / FINAL STATUS ("READY FOR OWNER REVIEW" or "BLOCKED — reason").
