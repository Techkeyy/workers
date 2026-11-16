import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTranslatePrompt, cleanOutput, collectImports, countExpects, extractSource, formatImports, resolveImport, translateTest, validateTestMd } from '../src/translate.js';

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

// ---- imported local files ------------------------------------------------------------------

function makeSuite(files) {
  const dir = mkdtempSync(join(tmpdir(), 'workers-imports-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}

test('collectImports follows relative imports, resolves .ts, and goes two levels deep', () => {
  const dir = makeSuite({
    'a.spec.ts': "import { test } from '@playwright/test';\nimport { Cart } from './pages/Cart';\nimport { x } from './fixtures';\n",
    'pages/Cart.ts': "import { Base } from './Base';\nexport class Cart {}\n",
    'pages/Base.ts': "import { deep } from '../deep';\nexport class Base {}\n",
    'deep.ts': 'export const deep = 1;\n',
    'fixtures.ts': "import { Cart } from './pages/Cart';\nexport const x = 1;\n",
  });
  const { files, truncated } = collectImports(join(dir, 'a.spec.ts'));
  assert.deepEqual(files.map((f) => f.path).sort(), ['fixtures.ts', 'pages/Base.ts', 'pages/Cart.ts']); // deep.ts is level 3
  assert.equal(truncated, false);
  assert.match(files.find((f) => f.path === 'pages/Cart.ts').source, /class Cart/);
});

test('collectImports ignores package imports and missing files, and dedupes', () => {
  const dir = makeSuite({
    'a.spec.ts': "import { test } from '@playwright/test';\nimport fs from 'node:fs';\nimport { n } from './nope';\nimport { a } from './h';\nimport { b } from './h.ts';\nconst r = require('./h');\n",
    'h.ts': 'export const a = 1;\n',
  });
  const { files } = collectImports(join(dir, 'a.spec.ts'));
  assert.deepEqual(files.map((f) => f.path), ['h.ts']);
  assert.equal(resolveImport(join(dir, 'a.spec.ts'), 'left-pad'), null);
});

test('collectImports resolves index files and .js specifiers that point at .ts', () => {
  const dir = makeSuite({
    'a.spec.ts': "import { p } from './pages';\nimport { q } from './q.js';\n",
    'pages/index.ts': 'export const p = 1;\n',
    'q.ts': 'export const q = 1;\n',
  });
  const { files } = collectImports(join(dir, 'a.spec.ts'));
  assert.deepEqual(files.map((f) => f.path).sort(), ['pages/index.ts', 'q.ts']);
});

test('collectImports caps the total size and says so', () => {
  const dir = makeSuite({
    'a.spec.ts': "import './one';\nimport './two';\nimport './three';\n",
    'one.ts': '1'.repeat(60),
    'two.ts': '2'.repeat(60),
    'three.ts': '3'.repeat(60),
  });
  const res = collectImports(join(dir, 'a.spec.ts'), { maxBytes: 100 });
  assert.equal(res.truncated, true);
  assert.equal(res.files.length, 2); // third file dropped, second cut
  assert.match(res.files[1].source, /truncated/);
  assert.match(formatImports(res), /size cap/);
});

test('formatImports delimits each file by path and is empty with no imports', () => {
  assert.equal(formatImports({ files: [], truncated: false }), '');
  const out = formatImports({ files: [{ path: 'pages/Cart.ts', source: 'class Cart {}' }], truncated: false });
  assert.match(out, /===== FILE: pages\/Cart\.ts =====\nclass Cart \{\}/);
  assert.match(buildTranslatePrompt({ title: 't', source: 's', url: 'u', imports: out }), /FILE: pages\/Cart\.ts/);
});

test('the shop example spec pulls in its page objects and fixtures', () => {
  const shop = fileURLToPath(new URL('../examples/shop/tests/checkout.spec.ts', import.meta.url));
  const { files } = collectImports(shop);
  assert.deepEqual(files.map((f) => f.path).sort(), ['fixtures.ts', 'pages/CartPage.ts', 'pages/LoginPage.ts', 'pages/ShopPage.ts']);
});
