import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const loadRules = (tighten = false) =>
  readFileSync(join(here, 'rules.md'), 'utf8') + (tighten ? `

${readFileSync(join(here, 'rules-tighten.md'), 'utf8')}` : '');

// Tighten mode: the whole spec file goes along as reference for exact label formats (capped).
export const specReference = (file, src) =>
  `

// ===== FILE: ${file.split(/[\/]/).pop()} (whole spec file, reference for exact visible text only) =====
${src.slice(0, 40000)}`;

// ---- extract the relevant Playwright source for one test -------------------------------------

// Index just past the matching close of the bracket at `open`; skips strings and comments.
function matchClose(src, open) {
  const pairs = { '(': ')', '{': '}', '[': ']' };
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') i = src.indexOf('\n', i) === -1 ? src.length : src.indexOf('\n', i);
    else if (c === '/' && src[i + 1] === '*') i = src.indexOf('*/', i) + 1;
    else if (c === "'" || c === '"' || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
    } else if (pairs[c]) depth++;
    else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return src.length;
}

// Source blocks: every `test(` / `test.describe(` call, as [start, end, kind].
function blocks(src) {
  const out = [];
  const re = /(^|\n)([ \t]*)(test\.describe|test)\(/g;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index + m[1].length;
    const open = src.indexOf('(', start);
    let end = matchClose(src, open);
    if (src[end] === ';') end++;
    out.push({ start, end, kind: m[3] === 'test' ? 'test' : 'describe' });
  }
  return out;
}

// Whole file, minus every other test and every describe that does not contain the target line.
// What remains: the target test, its enclosing describes, hooks (beforeEach/afterEach), constants, helpers.
export function extractSource(src, line) {
  const lineOf = (pos) => src.slice(0, pos).split('\n').length;
  const all = blocks(src);
  const target = all.find((b) => b.kind === 'test' && lineOf(b.start) === line);
  if (!target) throw new Error(`No test found at line ${line}`);
  const remove = all.filter((b) => {
    if (b === target) return false;
    const containsTarget = b.start <= target.start && b.end >= target.end;
    if (b.kind === 'describe') return !containsTarget;
    // other tests: removed (unless nested inside a removed describe, handled by overlap below)
    return true;
  });
  // drop nested removals already covered by an outer removal
  const cuts = remove.filter((b) => !remove.some((o) => o !== b && o.start <= b.start && o.end >= b.end && (o.start < b.start || o.end > b.end)));
  let out = '';
  let pos = 0;
  for (const c of cuts.sort((a, b) => a.start - b.start)) {
    out += src.slice(pos, c.start);
    pos = c.end;
  }
  out += src.slice(pos);
  return {
    source: out.replace(/\n{3,}/g, '\n\n').trim(),
    testBlock: src.slice(target.start, target.end),
  };
}

// ---- imported local modules (page objects, fixtures) -----------------------------------------

const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts'];
const IMPORT_RE = /(?:\bimport|\bexport)\s[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;

const isFile = (p) => existsSync(p) && statSync(p).isFile();

// Resolve a relative import specifier to an existing file, trying extensions and index files.
export function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null; // package imports (and node_modules) are never followed
  const base = resolve(dirname(fromFile), spec);
  const candidates = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => join(base, 'index' + e))];
  const stripped = base.replace(/\.(m?js|jsx)$/, ''); // './x.js' may really be x.ts
  if (stripped !== base) candidates.push(...EXTS.map((e) => stripped + e));
  return candidates.find((c) => isFile(c)) ?? null;
}

export function importSpecifiers(src) {
  const out = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

// Local files the spec imports (one level), plus what those import (one more level). Deduplicated,
// capped at maxBytes in total. Returns {files: [{path, source}], truncated}; path is relative to the spec's folder.
export function collectImports(specFile, { maxBytes = 40 * 1024, depth = 2 } = {}) {
  const root = dirname(resolve(specFile));
  const seen = new Set([resolve(specFile)]);
  const files = [];
  let used = 0;
  let truncated = false;
  let level = [resolve(specFile)];
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (const from of level) {
      for (const spec of importSpecifiers(readFileSync(from, 'utf8'))) {
        const file = resolveImport(from, spec);
        if (!file || seen.has(file)) continue;
        seen.add(file);
        next.push(file);
        let source = readFileSync(file, 'utf8');
        const room = maxBytes - used;
        if (room <= 0) {
          truncated = true;
          continue;
        }
        if (Buffer.byteLength(source) > room) {
          source = Buffer.from(source).subarray(0, room).toString('utf8') + '\n// ... truncated (size cap reached)';
          truncated = true;
        }
        used += Buffer.byteLength(source);
        files.push({ path: relative(root, file).split(sep).join('/'), source });
      }
    }
    level = next;
  }
  return { files, truncated };
}

// Prompt section for the collected imports ('' when there are none).
// Playwright setup projects (auth.setup.ts and similar) often log in before the tests run, so the
// test itself never shows the login. Collect *.setup.* files from the spec's folder and up to two
// parent folders, so the agent can write those steps into the Kane test.
export function collectSetupFiles(specFile, { maxBytes = 20 * 1024 } = {}) {
  const out = [];
  let dir = dirname(resolve(specFile));
  let used = 0;
  for (let level = 0; level < 3; level++) {
    let names = [];
    try { names = readdirSync(dir); } catch { break; }
    for (const name of names.sort()) {
      if (!/\.setup\.(ts|js|mjs|mts)$/.test(name)) continue;
      const full = join(dir, name);
      if (out.some((f) => f.path === full)) continue;
      const text = readFileSync(full, 'utf8');
      if (used + text.length > maxBytes) break;
      used += text.length;
      out.push({ path: full, rel: relative(dirname(resolve(specFile)), full).split(sep).join('/') || name, text });
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return out;
}

export function formatSetupFiles(files) {
  if (!files.length) return '';
  return '\n\n# Playwright setup files (they run before the tests, for example to log in)\n' +
    files.map((f) => `// ===== SETUP FILE: ${f.rel} =====\n${f.text}`).join('\n');
}

export function formatImports({ files, truncated }) {
  if (!files.length) return '';
  const blocks = files.map((f) => `// ===== FILE: ${f.path} =====
${f.source.trim()}`).join('\n\n');
  const note = truncated ? ' Some files were omitted or cut because of a size cap.' : '';
  return `
# Imported local files (page objects, fixtures, helpers)
The test uses these files. Expand every page-object method, fixture and helper it calls into the concrete steps and values it performs.${note}

\`\`\`ts
${blocks}
\`\`\`
`;
}

// ---- prompt --------------------------------------------------------------------------------

export function buildTranslatePrompt({ title, source, url, imports = '', rules = loadRules() }) {
  return `You convert a Playwright test into a Kane CLI test file (\`_test.md\`).

# Translation rules
${rules}

# App URL (use as the frontmatter \`url\`)
${url}

# The Playwright test to convert: "${title}"
The code below contains this one test plus its enclosing describe blocks, hooks (beforeEach/afterEach), constants and helper functions. Convert only the test named "${title}".

\`\`\`ts
${source}
\`\`\`
${imports}
# Output
Return ONLY the full contents of the \`_test.md\` file, starting with the \`---\` frontmatter line. No commentary, no code fences.`;
}

// ---- validation ---------------------------------------------------------------------------

export function cleanOutput(text) {
  let t = String(text).trim();
  const fenced = t.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/);
  if (fenced) t = fenced[1].trim();
  const start = t.indexOf('---');
  if (start > 0) t = t.slice(start); // drop chatter before the frontmatter
  return t + '\n';
}

export const countExpects = (src) => (src.match(/\bexpect\s*\(/g) || []).length;

// Returns a list of problems (empty = valid).
export function validateTestMd(md, { expectCount = 0 } = {}) {
  const problems = [];
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) problems.push('missing YAML frontmatter (--- ... ---) at the top');
  else {
    if (!/^mode:\s*testing\s*$/m.test(fm[1])) problems.push('frontmatter must contain "mode: testing"');
    if (!/^url:\s*\S+/m.test(fm[1])) problems.push('frontmatter must contain "url: <app url>"');
  }
  const steps = (md.match(/^## .+$/gm) || []).length;
  if (steps < 1) problems.push('needs at least one "## Step" heading');
  const verifies = (md.match(/^\s*(?:[-*]\s*)?Verify\b/gim) || []).length;
  if (expectCount > 0 && verifies < 1) problems.push('has no "Verify ..." line, but the Playwright test has assertions');
  // No upper bound on the count: one fact asserted several ways correctly collapses to one Verify line,
  // so the number of expects says nothing about how many Verify lines are right.
  return problems;
}

// ---- translate one test ---------------------------------------------------------------------

// agent: {name, run(prompt, {model}) -> text}. Retries once, telling the agent what was wrong.
export async function translateTest({ test, url, agent, model, tighten = false }) {
  const src = readFileSync(test.file, 'utf8');
  const { source } = extractSource(src, test.line);
  const expectCount = countExpects(source);
  const imports = formatImports(collectImports(test.file)) + formatSetupFiles(collectSetupFiles(test.file)) + (tighten ? specReference(test.file, src) : '');
  const base = buildTranslatePrompt({ title: test.title, source, url, imports, rules: loadRules(tighten) });
  let prompt = base;
  let problems = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const md = cleanOutput(await agent.run(prompt, { model }));
    problems = validateTestMd(md, { expectCount });
    if (!problems.length) return { md, attempts: attempt, prompt: base };
    prompt = `${base}\n\n# Your previous answer was rejected\nProblems:\n${problems.map((p) => `- ${p}`).join('\n')}\nReturn a corrected full \`_test.md\`.`;
  }
  throw new Error(`Translation of "${test.title}" is invalid after a retry: ${problems.join('; ')}`);
}

