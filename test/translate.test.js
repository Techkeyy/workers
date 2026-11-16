import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildTranslatePrompt, cleanOutput, countExpects, extractSource, translateTest, validateTestMd } from '../src/translate.js';

const specPath = fileURLToPath(new URL('../demo/tests/demo-todo-app.spec.ts', import.meta.url));
const spec = readFileSync(specPath, 'utf8');

const GOOD = `---
mode: testing
url: http://localhost:4173/
headless: true
max_steps: 15
---

# Title

## Step one
Type "a" and press Enter.
Verify the exact visible text of the todo counter is "1 item left".
Verify the list shows exactly these items: "a".
Verify the exact visible text of the first todo is "a".
`;

test('validateTestMd accepts a good file', () => {
  assert.deepEqual(validateTestMd(GOOD, { expectCount: 2 }), []);
});

test('validateTestMd flags missing frontmatter, steps, and Verify lines', () => {
  assert.match(validateTestMd('# T\n## S\nVerify x', {}).join(), /frontmatter/);
  assert.match(validateTestMd(GOOD.replace('## Step one', 'Step one'), {}).join(), /Step/);
  assert.match(validateTestMd(GOOD.replace(/Verify.*\n/g, ''), { expectCount: 1 }).join(), /no "Verify/);
  // same fact asserted several ways collapses to one Verify line: many expects never demand more Verify lines
  assert.deepEqual(validateTestMd(GOOD, { expectCount: 8 }), []);
  assert.match(validateTestMd(GOOD.replace('mode: testing', 'mode: x'), {}).join(), /mode: testing/);
});

test('cleanOutput strips code fences and chatter before the frontmatter', () => {
  assert.equal(cleanOutput('```markdown\n' + GOOD.trim() + '\n```'), GOOD.trim() + '\n');
  assert.equal(cleanOutput('Here you go:\n' + GOOD), GOOD.trim() + '\n');
});

test('extractSource keeps the target test, hooks, constants and helpers, but not other tests', () => {
  const { source, testBlock } = extractSource(spec, 53);
  assert.match(source, /should append new items to the bottom of the list/);
  assert.match(source, /page\.goto\('\/'\)/); // top-level beforeEach
  assert.match(source, /const TODO_ITEMS/);
  assert.match(source, /async function createDefaultTodos/);
  assert.doesNotMatch(source, /should clear text input field/);
  assert.doesNotMatch(source, /Mark all as completed/);
  assert.match(testBlock, /^\s*test\('should append/);
  assert.equal(countExpects(source), 5);
});

test('extractSource keeps the enclosing describe hooks', () => {
  const line = spec.split('\n').findIndex((l) => l.includes('should allow me to mark all items as completed')) + 1;
  const { source } = extractSource(spec, line);
  assert.match(source, /test\.beforeEach\(async \(\{ page \}\) => \{\n    await createDefaultTodos/);
});

test('prompt contains the rules, the url, and the test source', () => {
  const { source } = extractSource(spec, 53);
  const p = buildTranslatePrompt({ title: 'T', source, url: 'http://x/', rules: 'RULES-HERE' });
  assert.match(p, /RULES-HERE/);
  assert.match(p, /http:\/\/x\//);
  assert.match(p, /toHaveText\('3 items left'\)/);
});

const test3 = { file: specPath, line: 53, title: 'should append new items to the bottom of the list' };

test('translateTest returns valid output from a stub agent without retry', async () => {
  const agent = { name: 'stub', run: async () => '```\n' + GOOD + '```' };
  const r = await translateTest({ test: test3, url: 'http://localhost:4173/', agent });
  assert.equal(r.attempts, 1);
  assert.match(r.md, /^---\nmode: testing/);
});

test('translateTest retries once with the problems listed, then succeeds', async () => {
  const prompts = [];
  const answers = ['no frontmatter here', GOOD];
  const agent = { name: 'stub', run: async (p) => (prompts.push(p), answers.shift()) };
  const r = await translateTest({ test: test3, url: 'http://localhost:4173/', agent });
  assert.equal(r.attempts, 2);
  assert.match(prompts[1], /previous answer was rejected/);
  assert.match(prompts[1], /frontmatter/);
});

test('translateTest throws after a failed retry', async () => {
  const agent = { name: 'stub', run: async () => 'still nothing' };
  await assert.rejects(translateTest({ test: test3, url: 'u', agent }), /invalid after a retry/);
});
