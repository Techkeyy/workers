import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRepairPrompt, collectEvidence, lineDiff, repairLoop } from '../src/loop.js';

const MUTANT_TEXT = ['MUTANT-DESCRIPTION-SECRET', 'itemWord = \'item\'', 'app.js', 'B3'];
const mutants = [
  { id: 'B3', kind: 'bug', description: MUTANT_TEXT[0], file: 'app.js', find: 'itemWord = activeCount', replace: MUTANT_TEXT[1] },
  { id: 'R1', kind: 'refactor', description: 'renamed', file: 'index.html', find: 'a', replace: 'b' },
];

const MD = `---
mode: testing
url: http://localhost:4173/
---

# T

## S
Verify the todo counter reads "3 items left".
`;
const BETTER = MD.replace('reads', 'exact visible text is');

function state(over = {}) {
  return {
    test: { title: 'should append new items' },
    pwSource: "test('x', async () => { await expect(c).toHaveText('3 items left'); });",
    md: MD,
    cells: { clean: 'ok', B3: 'kane-weaker', R1: 'false-alarm-avoided' },
    pw: { clean: { passed: true }, B3: { passed: false, errorMessage: 'Expected: "3 items left" Received: "3 item left"' }, R1: { passed: false, errorMessage: 'locator not found' } },
    kane: { clean: { status: 'passed', stepSummaries: [], runSummaries: [] }, B3: { status: 'passed', stepSummaries: ['passed: assert: the todo counter reads "3 items left"'], runSummaries: ['counter shows 3 items left'] } },
    loop: [],
    ...over,
  };
}

test('repair prompt has PW source, current md, PW error and Kane steps', () => {
  const s = state();
  const p = buildRepairPrompt({ title: s.test.title, pwSource: s.pwSource, currentMd: s.md, ...collectEvidence(s, mutants), rules: 'RULES' });
  assert.match(p, /toHaveText\('3 items left'\)/);
  assert.match(p, /Verify the todo counter reads "3 items left"/);
  assert.match(p, /Received: "3 item left"/);
  assert.match(p, /passed: assert: the todo counter reads/);
});

test('repair prompt never contains the mutant id, description, file or diff', () => {
  const s = state();
  const p = buildRepairPrompt({ title: s.test.title, pwSource: s.pwSource, currentMd: s.md, ...collectEvidence(s, mutants), rules: 'RULES' });
  assert.ok(!p.includes('MUTANT-DESCRIPTION-SECRET'));
  assert.ok(!p.includes("itemWord = 'item'"));
  assert.ok(!p.includes('B3'));
  assert.ok(!p.includes('app.js'));
  assert.ok(!p.includes('R1')); // the refactor cell is not evidence either
  assert.ok(!p.includes('locator not found'));
});

test('broken-on-clean evidence carries the failed step', () => {
  const s = state({ cells: { clean: 'broken-on-clean', B3: 'pw-only', R1: 'pw-only' }, kane: { clean: { status: 'failed', failedStep: { index: 3, summary: 'assert: x' }, stepSummaries: ['failed: assert: x'], runSummaries: ['could not read'] } } });
  const ev = collectEvidence(s, mutants);
  assert.equal(ev.weaknesses.length, 0);
  const p = buildRepairPrompt({ title: 't', pwSource: 's', currentMd: 'm', ...ev, rules: 'R' });
  assert.match(p, /FAILED on the unchanged app/);
  assert.match(p, /assert: x/);
});

test('lineDiff shows only changed lines', () => {
  assert.equal(lineDiff('a\nb\nc', 'a\nB\nc'), '- b\n+ B');
});

test('repairLoop: weaker -> agent rewrites -> parity, with a loop log', async () => {
  const s = state();
  const written = [];
  const prompts = [];
  await repairLoop(s, mutants, {
    rounds: 2,
    agent: { run: async (p) => (prompts.push(p), BETTER) },
    writeMd: (st, md) => written.push(md),
    evaluate: async (st) => { st.cells = { clean: 'ok', B3: 'parity-caught', R1: 'false-alarm-avoided' }; },
  });
  assert.equal(s.status, 'repaired');
  assert.equal(written.length, 1);
  assert.equal(s.loop.length, 1);
  assert.deepEqual(s.loop[0].weakOn, ['B3']);
  assert.match(s.loop[0].change, /^- .*reads/m);
  assert.equal(s.loop[0].after.B3, 'parity-caught');
  assert.equal(prompts.length, 1);
});

test('repairLoop stops at the cap and marks needs-human with a reason', async () => {
  const s = state();
  let calls = 0;
  await repairLoop(s, mutants, {
    rounds: 2,
    agent: { run: async () => (calls++, BETTER) },
    writeMd: () => {},
    evaluate: async () => {}, // still weaker
  });
  assert.equal(calls, 2);
  assert.equal(s.status, 'needs-human');
  assert.match(s.reason, /after 2 repair round/);
  assert.equal(s.loop.length, 2);
});

test('repairLoop marks needs-human when the agent returns an invalid file', async () => {
  const s = state();
  await repairLoop(s, mutants, { rounds: 2, agent: { run: async () => 'nonsense' }, writeMd: () => {}, evaluate: async () => {} });
  assert.equal(s.status, 'needs-human');
  assert.match(s.reason, /invalid/);
});

test('repairLoop does nothing when the test is already at parity', async () => {
  const s = state({ cells: { clean: 'ok', B3: 'parity-caught', R1: 'parity' } });
  await repairLoop(s, mutants, { rounds: 2, agent: { run: async () => assert.fail('no call expected') }, writeMd: () => {}, evaluate: async () => {} });
  assert.equal(s.loop.length, 0);
});
