import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseKane } from '../src/run-kane.js';

const fx = (name) => readFileSync(join(fileURLToPath(new URL('./fixtures/kane/', import.meta.url)), name), 'utf8');

test('fixtures contain no private dashboard links', () => {
  for (const f of ['replay-failed-mutant.ndjson', 'replay-passed.ndjson', 'author-failed-step2.ndjson']) {
    assert.ok(!fx(f).includes('test-manager.lambdatest.com'), f);
  }
});

test('replay-passed: passed, 2 replay decisions, 0 credits', () => {
  const r = parseKane(fx('replay-passed.ndjson'), 0);
  assert.equal(r.status, 'passed');
  assert.equal(r.failedStep, null);
  assert.equal(r.replayDecisions, 2);
  assert.equal(r.authorDecisions, 0);
  assert.equal(r.credits, 0);
  assert.equal(r.healTriggered, false);
  assert.ok(r.stepSummaries.includes('passed: assert: the todo counter reads "1 item left"'));
});

test('replay-failed-mutant: failed at the assert step, heal flagged, credits summed', () => {
  const r = parseKane(fx('replay-failed-mutant.ndjson'), 1);
  assert.equal(r.status, 'failed');
  assert.equal(r.failedStep.summary, 'assert: the todo counter reads "1 item left"');
  assert.equal(r.failedStep.index, 5);
  assert.equal(r.healTriggered, true);
  assert.equal(r.replayDecisions, 2);
  assert.ok(r.credits > 0);
  assert.ok(r.runSummaries.some((s) => s.includes('0 items left')));
});

test('author-failed-step2: failed, author decisions, share url redacted, credits = sum of run_end', () => {
  const r = parseKane(fx('author-failed-step2.ndjson'), 1);
  assert.equal(r.status, 'failed');
  assert.equal(r.authorDecisions, 2);
  assert.equal(r.shareUrl, 'REDACTED');
  const runEnds = fx('author-failed-step2.ndjson').split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l)).filter((e) => e.type === 'run_end');
  assert.equal(r.credits, runEnds.reduce((n, e) => n + (e.credits_consumed || 0), 0));
  assert.ok(r.failedStep);
});

test('non-JSON lines are ignored; exit codes 2 and 3 are errors, never verdicts', () => {
  const noisy = 'banner text\n' + fx('replay-passed.ndjson') + '\n{broken json\n';
  assert.equal(parseKane(noisy, 0).status, 'passed');
  assert.equal(parseKane(fx('replay-passed.ndjson'), 2).status, 'error');
  assert.equal(parseKane('Not logged in', 2).status, 'error');
  assert.equal(parseKane('', 3).status, 'error');
  assert.equal(parseKane('', 0).status, 'error'); // exit 0 with no verdict is not trusted
});
