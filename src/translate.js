import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const loadRules = () => readFileSync(join(here, 'rules.md'), 'utf8');

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

// ---- prompt --------------------------------------------------------------------------------

export function buildTranslatePrompt({ title, source, url, rules = loadRules() }) {
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
  // Every expect should be represented; allow merging of the same fact asserted several ways.
  const needed = Math.ceil(expectCount / 2);
  if (verifies < needed) problems.push(`has ${verifies} Verify line(s) for ${expectCount} Playwright expects; at least ${needed} are needed (one per assertion)`);
  return problems;
}

// ---- translate one test ---------------------------------------------------------------------

// agent: {name, run(prompt, {model}) -> text}. Retries once, telling the agent what was wrong.
export async function translateTest({ test, url, agent, model }) {
  const src = readFileSync(test.file, 'utf8');
  const { source } = extractSource(src, test.line);
  const expectCount = countExpects(source);
  const base = buildTranslatePrompt({ title: test.title, source, url });
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

