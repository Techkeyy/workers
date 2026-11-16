import { stripAnsi } from './util.js';
import { playwrightJson } from './inventory.js';

// Playwright results JSON -> Map(specId -> {passed, errorMessage})
export function parseResults(json) {
  const map = new Map();
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      const results = (spec.tests ?? []).flatMap((t) => t.results ?? []);
      const failed = results.find((r) => r.status !== 'passed' && r.status !== 'skipped');
      let msg = null;
      if (failed) {
        const e = failed.errors?.[0] ?? failed.error;
        msg = stripAnsi(e?.message ?? failed.status);
      }
      map.set(spec.id, { passed: !failed && spec.ok !== false, errorMessage: msg });
    }
    (suite.suites ?? []).forEach(walk);
  };
  (json.suites ?? []).forEach(walk);
  return map;
}

// Regex for a test title that is safe inside a shell command: letters, digits, space, _ - and non-ASCII are kept,
// every other character (all shell and regex metacharacters) becomes '.', which still matches it. Matching a few
// extra tests is harmless: results are mapped by test id.
export const grepPattern = (title) => String(title).replace(/[\x00-\x1f\x21-\x2c\x2e-\x2f\x3a-\x40\x5b-\x5e\x60\x7b-\x7f]/g, '.');

// Run the selected tests once (one Playwright process). Results are mapped by id.
export async function runPlaywright(config, tests, { all = false } = {}) {
  const args = [];
  if (!all) {
    args.push('--grep', `(${tests.map((t) => grepPattern(t.title)).join('|')})`);
  }
  const map = parseResults(await playwrightJson(args, config));
  const out = {};
  for (const t of tests) out[t.id] = map.get(t.id) ?? { passed: false, errorMessage: 'test did not run', didNotRun: true };
  return out;
}
