import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { run } from './util.js';

// Playwright --list JSON -> [{id, file, title, titlePath, line}]
export function parseList(json) {
  const root = json.config?.rootDir ?? '.';
  const out = [];
  const walk = (suite, path) => {
    for (const spec of suite.specs ?? []) {
      out.push({ id: spec.id, file: resolve(root, spec.file), title: spec.title, titlePath: [...path, spec.title], line: spec.line });
    }
    for (const child of suite.suites ?? []) walk(child, [...path, child.title]);
  };
  // top-level suites are files; their titles are not part of the title path
  for (const fileSuite of json.suites ?? []) walk(fileSuite, []);
  return out;
}

export async function playwrightJson(args, config, env = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'workers-pw-'));
  const outFile = join(dir, 'out.json');
  try {
    const r = await run('npx', ['playwright', 'test', '-c', resolve(config), ...args, '--reporter=json'], {
      cwd: dirname(resolve(config)),
      env: { PLAYWRIGHT_JSON_OUTPUT_NAME: outFile, ...env },
      timeoutMs: 600000,
    });
    try {
      return JSON.parse(readFileSync(outFile, 'utf8'));
    } catch {
      throw new Error(`Playwright produced no JSON report (exit ${r.code}). ${(r.stderr || r.stdout).trim().split('\n').slice(-3).join(' ')}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function listTests(config) {
  const json = await playwrightJson(['--list'], config);
  return { tests: parseList(json), webServer: json.config?.webServer ?? null, configDir: dirname(resolve(config)) };
}
