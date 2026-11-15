import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseList } from '../src/inventory.js';
import { parseResults } from '../src/run-playwright.js';

const fx = (n) => JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/pw/${n}`, import.meta.url)), 'utf8'));

test('inventory: parses 24 tests from real --list JSON with id, file, title, titlePath, line', () => {
  const tests = parseList(fx('list.json'));
  assert.equal(tests.length, 24);
  const t = tests.find((x) => x.title === 'should append new items to the bottom of the list');
  assert.equal(t.line, 53);
  assert.deepEqual(t.titlePath, ['New Todo', 'should append new items to the bottom of the list']);
  assert.match(t.file, /demo-todo-app\.spec\.ts$/);
  assert.match(t.id, /^[0-9a-f]+-[0-9a-f]+$/);
  assert.equal(new Set(tests.map((x) => x.id)).size, 24);
});

test('results: clean run maps every inventory id to passed', () => {
  const tests = parseList(fx('list.json'));
  const res = parseResults(fx('clean.json'));
  assert.equal(res.size, 24);
  for (const t of tests) assert.equal(res.get(t.id)?.passed, true, t.title);
});

test('results: mutant B3 run fails exactly the counter test, with a readable error and no ANSI codes', () => {
  const tests = parseList(fx('list.json'));
  const res = parseResults(fx('b3-mutant.json'));
  const failed = tests.filter((t) => !res.get(t.id).passed);
  assert.deepEqual(failed.map((t) => t.title), ['should append new items to the bottom of the list']);
  const msg = res.get(failed[0].id).errorMessage;
  assert.match(msg, /3 items left/);
  assert.doesNotMatch(msg, /\u001b\[/);
});
