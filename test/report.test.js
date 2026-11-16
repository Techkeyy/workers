import test from 'node:test';
import assert from 'node:assert/strict';
import { headline, renderHtml } from '../src/report.js';

const report = {
  generatedAt: 'now',
  dryRun: false,
  mutants: [{ id: 'B1', kind: 'bug', description: 'd1' }, { id: 'R1', kind: 'refactor', description: 'd2' }],
  tests: [
    { title: 'a <b>', status: 'repaired', reason: null, cells: { clean: 'ok', B1: 'parity-caught', R1: 'false-alarm-avoided' }, pw: { clean: { passed: true }, B1: { passed: false }, R1: { passed: false } }, kane: { clean: { status: 'passed' }, B1: { status: 'failed' }, R1: { status: 'passed' } }, loop: [{ round: 1, weakOn: ['B1'], change: '- x\n+ y', after: { clean: 'ok' } }], pwLines: 20, mdLines: 8, credits: 12.34 },
    { title: 'b', status: 'needs-human', reason: 'r', cells: { clean: 'ok', B1: 'kane-weaker', R1: 'parity' }, pw: { clean: { passed: true }, B1: { passed: false }, R1: { passed: true } }, kane: { clean: { status: 'passed' }, B1: { status: 'passed' }, R1: { status: 'passed' } }, loop: [], pwLines: 10, mdLines: 6, credits: 5 },
    { title: 'c', status: 'old-test-failing', cells: { clean: 'old-test-failing', B1: 'excluded', R1: 'excluded' }, pw: { clean: { passed: false }, B1: { passed: false }, R1: { passed: false } }, kane: {}, loop: [], pwLines: 5, mdLines: 4, credits: 0 },
  ],
};

test('headline numbers', () => {
  const h = headline(report);
  assert.equal(h.testsSelected, 3);
  assert.equal(h.testsPorted, 2);
  assert.equal(h.bugCells, 2);
  assert.equal(h.bugsCaughtOld, 2);
  assert.equal(h.bugsCaughtNew, 1);
  assert.equal(h.falseAlarmsAvoided, 1);
  assert.equal(h.needsHuman, 1);
  assert.equal(h.pwLines, 35);
  assert.equal(h.mdLines, 18);
  assert.equal(h.credits, 17.3);
});

test('html is self-contained and escapes content', () => {
  const html = renderHtml({ ...report, headline: headline(report) });
  assert.doesNotMatch(html, /https?:\/\/(?!localhost)/);
  assert.match(html, /a &lt;b&gt;/);
  assert.match(html, /kane-weaker/);
  assert.match(html, /needs human: r/);
});

test('headline counts false-alarm-avoided, kane-false-alarm, kane-stronger and kane-weaker separately', async () => {
  const { doneLine } = await import('../src/report.js');
  const r = structuredClone(report);
  r.tests[0].cells.R1 = 'kane-false-alarm';
  r.tests[1].cells.R1 = 'false-alarm-avoided';
  r.tests[1].cells.B1 = 'kane-stronger';
  r.tests[0].cells.B1 = 'kane-weaker';
  const h = headline(r);
  assert.deepEqual([h.falseAlarmsAvoided, h.kaneFalseAlarms, h.kaneStronger, h.kaneWeaker], [1, 1, 1, 1]);
  assert.match(doneLine(h), /kane-stronger 1, kane-weaker 1\); refactors: false-alarm-avoided 1, kane-false-alarm 1;/);
});

test('healed tag and legend are rendered per cell', () => {
  const r = structuredClone(report);
  r.tests[0].kane.B1.healTriggered = true;
  const html = renderHtml({ ...r, headline: headline(r) });
  assert.equal((html.match(/<span class="heal">healed<\/span>/g) || []).length, 1);
  assert.match(html, /healed = Kane's self-healing re-authored a step during this run/);
});

import { readFileSync } from 'node:fs';
import { verdictSentence } from '../src/report.js';

const sample = JSON.parse(readFileSync(new URL('./fixtures/report.sample.json', import.meta.url), 'utf8'));

test('verdict is honest: clean run says every bug caught, weak run says so plainly', () => {
  const good = structuredClone(report);
  good.tests = [good.tests[0]];
  good.tests[0].cells.B1 = 'parity-caught';
  const v = verdictSentence({ ...good, headline: headline(good) });
  assert.match(v, /Kane caught every bug the old suite caught \(1\/1\)\./);
  assert.match(v, /avoided 1 false alarm the old suite raised/);
  const weak = verdictSentence({ ...sample, headline: headline(sample) });
  assert.match(weak, /Kane missed 1 bug the old suite caught/);
  assert.match(weak, /1 test still needs a human/);
  assert.doesNotMatch(weak, /every bug/);
});

test('sample report renders matrix labels, legend, repair log, links and no long dashes', () => {
  const html = renderHtml({ ...sample, headline: headline(sample) });
  for (const w of ['Kane weaker', 'false alarm avoided', 'neither caught', 'both caught']) assert.ok(html.includes(w), w);
  assert.match(html, /PW ✗ fail &middot; Kane ✗ fail/);
  assert.match(html, /<span class="heal">healed<\/span>/);
  assert.match(html, /<th scope="col" title="Cart total ignores quantity">B1<small>bug<\/small>/);
  assert.match(html, /<li><b>B1<\/b><span class="k">bug<\/span>Cart total ignores quantity<\/li>/);
  assert.match(html, /<h4>Round 1<\/h4>/);
  assert.match(html, /href="tests\/[^"]+_test\.md"/);
  assert.doesNotMatch(html, /[–—]/);
  assert.doesNotMatch(html, /https?:\/\//);
});

test('no repairs: says so plainly', () => {
  const r = structuredClone(report);
  r.tests.forEach((t) => (t.loop = []));
  assert.match(renderHtml({ ...r, headline: headline(r) }), /No repairs were needed: every ported test matched the old suite on the first try\./);
});
