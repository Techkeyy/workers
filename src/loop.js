// Repair loop. The agent gets what the OLD test asserted (Playwright's failure message and source) and
// what Kane did (its step summaries). It never gets the mutant's id, description, file or diff (design rule 2).
import { needsRepair } from './parity.js';
import { cleanOutput, countExpects, loadRules, validateTestMd } from './translate.js';

const bullets = (lines) => lines.map((l) => `- ${l}`).join('\n') || '- (none)';
const clip = (s, n = 1500) => (s.length > n ? s.slice(0, n) + ' ...' : s);

// weaknesses: [{playwrightError, kaneSteps, kaneNotes}] one per place Kane was weaker
// brokenOnClean: null | {failedStep, kaneSteps, kaneNotes}
export function buildRepairPrompt({ title, pwSource, currentMd, weaknesses = [], brokenOnClean = null, rules = loadRules() }) {
  let evidence = '';
  if (brokenOnClean) {
    evidence += `## The Kane test FAILED on the unchanged app, where the original Playwright test passes.
Failed step: ${brokenOnClean.failedStep ? brokenOnClean.failedStep.summary : '(unknown)'}
What Kane did:
${bullets(brokenOnClean.kaneSteps)}
Kane's notes:
${bullets(brokenOnClean.kaneNotes)}

`;
  }
  weaknesses.forEach((w, i) => {
    evidence += `## Missed regression ${i + 1}
In one broken version of the app the ORIGINAL Playwright test FAILED with this error, but the Kane test PASSED, so the Kane test is weaker than the original.
Playwright failure (what the old test asserted and what it saw):
\`\`\`
${clip(w.playwrightError ?? '(no message)')}
\`\`\`
What Kane did in that run:
${bullets(w.kaneSteps)}
Kane's notes:
${bullets(w.kaneNotes)}

`;
  });
  return `You are fixing a Kane CLI test (\`_test.md\`) so it is at least as strict as the Playwright test it was ported from.

# Rules for \`_test.md\` files
${rules}

# Original Playwright test: "${title}"
\`\`\`ts
${pwSource}
\`\`\`

# Current \`_test.md\`
\`\`\`
${currentMd}
\`\`\`

# Evidence
${evidence}
# Your task
Rewrite the \`_test.md\` so that it would fail wherever the original Playwright test fails, and still pass on the correct app. Typically this means making a Verify line more exact (the full exact visible text, not just a number or a rough description) or adding a Verify line the original asserted. Keep to the original test's intent. Do not guess at what was broken in the app; derive checks from the Playwright test and its error.

Return ONLY the full contents of the new \`_test.md\`, starting with the \`---\` frontmatter line. No commentary, no code fences.`;
}

// Tiny line diff (LCS) -> ['- removed', '+ added', '  same']
export function lineDiff(a, b) {
  const x = a.split('\n');
  const y = b.split('\n');
  const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) (out.push('  ' + x[i]), i++, j++);
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push('- ' + x[i++]);
    else out.push('+ ' + y[j++]);
  }
  while (i < x.length) out.push('- ' + x[i++]);
  while (j < y.length) out.push('+ ' + y[j++]);
  return out.filter((l) => !l.startsWith('  ')).join('\n');
}

// Evidence from a test state (see port.js for its shape).
export function collectEvidence(state, mutants) {
  const notes = (k) => k?.runSummaries ?? [];
  const brokenOnClean = state.cells.clean === 'broken-on-clean'
    ? { failedStep: state.kane.clean.failedStep, kaneSteps: state.kane.clean.stepSummaries, kaneNotes: notes(state.kane.clean) }
    : null;
  const weaknesses = mutants
    .filter((m) => m.kind === 'bug' && state.cells[m.id] === 'kane-weaker')
    .map((m) => ({ playwrightError: state.pw[m.id].errorMessage, kaneSteps: state.kane[m.id].stepSummaries, kaneNotes: notes(state.kane[m.id]) }));
  return { brokenOnClean, weaknesses };
}

// deps: { agent, model, writeMd(state, md), evaluate(state) -> updates state.kane/state.cells, log }
// Mutates state: state.md, state.status, state.loop (per-round log).
export async function repairLoop(state, mutants, { rounds = 2, agent, model, writeMd, evaluate, log = () => {} }) {
  state.loop = state.loop ?? [];
  for (let round = 1; round <= rounds && needsRepair(state.cells); round++) {
    const weak = Object.keys(state.cells).filter((k) => state.cells[k] === 'kane-weaker' || state.cells[k] === 'broken-on-clean');
    const prompt = buildRepairPrompt({ title: state.test.title, pwSource: state.pwSource, currentMd: state.md, ...collectEvidence(state, mutants) });
    log(`  repair round ${round}/${rounds} for "${state.test.title}" (weaker on: ${weak.join(', ')})`);
    let md;
    try {
      md = cleanOutput(await agent.run(prompt, { model }));
      const problems = validateTestMd(md, { expectCount: countExpects(state.pwSource) });
      if (problems.length) throw new Error(`agent returned an invalid _test.md: ${problems.join('; ')}`);
    } catch (e) {
      state.loop.push({ round, weakOn: weak, change: '', error: e.message, after: { ...state.cells } });
      state.status = 'needs-human';
      state.reason = e.message;
      return;
    }
    const change = lineDiff(state.md, md);
    state.md = md;
    writeMd(state, md);
    await evaluate(state);
    state.loop.push({ round, weakOn: weak, change, after: { ...state.cells } });
  }
  if (needsRepair(state.cells)) {
    state.status = 'needs-human';
    const left = Object.keys(state.cells).filter((k) => state.cells[k] === 'kane-weaker' || state.cells[k] === 'broken-on-clean');
    state.reason = `still not at parity after ${state.loop.length} repair round(s): ${left.join(', ')}`;
  } else if (state.loop.length) state.status = 'repaired';
}
