#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpSync, existsSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { port } from '../src/port.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Installed from npm, the demo lives under node_modules, where Node will not run TypeScript and where
// Workers should not edit files. So copy it to ./workers-demo and work on the copy. The copy gets a
// node_modules link to the folder that holds this package's @playwright/test.
function prepareDemo() {
  const src = join(root, 'demo');
  if (!/[\\/]node_modules[\\/]/.test(src)) return src;
  const dest = join(process.cwd(), 'workers-demo');
  if (!existsSync(dest)) {
    cpSync(src, dest, { recursive: true });
    console.log(`Copied the demo app and its Playwright tests to ${dest}`);
  }
  const link = join(dest, 'node_modules');
  if (!existsSync(link)) {
    const pwEntry = createRequire(import.meta.url).resolve('@playwright/test');
    symlinkSync(join(dirname(pwEntry), '..', '..'), link, 'junction');
  }
  return dest;
}

const HELP = `workers: port a Playwright suite to Kane CLI tests and prove they catch the same bugs.

Usage:
  workers port --config <playwright.config> --app <dir> --mutants <file.json> [options]
  workers demo [options]            port with the bundled TodoMVC demo defaults

Options:
  --config <file>        Playwright config to read tests from
  --app <dir>            directory of the app whose files the mutants edit (temporarily)
  --mutants <file>       mutants JSON: [{id, kind: "bug"|"refactor", description, file, find, replace}]
  --url <url>            app URL for the tests (default: the config's webServer.url)
  --out <dir>            output folder for _test.md files and the report (default: workers-out)
  --grep <text>          only port tests whose title contains this text (several: "a|b")
  --max-tests <n>        port at most n tests
  --repair-rounds <n>    agent repair rounds per weak test (default: 2)
  --agent claude|codex   coding agent that writes the tests (default: claude; falls back to
                         codex if claude is not logged in and codex is)
  --agent-model <name>   model name passed to the agent
  --resume               reuse the _test.md files already in --out (after an interrupted run);
                         Kane replays their recordings instead of authoring them again
  --dry-run              everything except Kane: list, translate, run Playwright on every
                         mutant, then print the plan and a credit estimate
  -h, --help             show this help

Kane credit estimate: authoring is about 40 credits per test. A clean replay costs 0.
A mutant run where Kane's self-healing kicks in costs about 10-30 credits.
Mutant runs use Kane's default (self-healing on); the test's local Kane cache is restored before
and after every mutant run.`;

const options = {
  config: { type: 'string' },
  app: { type: 'string' },
  mutants: { type: 'string' },
  url: { type: 'string' },
  out: { type: 'string', default: 'workers-out' },
  grep: { type: 'string' },
  'max-tests': { type: 'string' },
  'repair-rounds': { type: 'string', default: '2' },
  agent: { type: 'string', default: 'claude' },
  'agent-model': { type: 'string' },
  'dry-run': { type: 'boolean', default: false },
  resume: { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false },
};

async function main() {
  let parsed;
  try {
    parsed = parseArgs({ args: process.argv.slice(2), options, allowPositionals: true });
  } catch (e) {
    console.error(`${e.message}\n\n${HELP}`);
    process.exit(2);
  }
  const { values: v, positionals } = parsed;
  const [cmd] = positionals;
  if (v.help || !cmd) {
    console.log(HELP);
    process.exit(v.help || !cmd ? 0 : 2);
  }
  if (cmd !== 'port' && cmd !== 'demo') {
    console.error(`Unknown command "${cmd}".\n\n${HELP}`);
    process.exit(2);
  }
  const demo = cmd === 'demo';
  const demoDir = demo ? prepareDemo() : null;
  const opts = {
    config: v.config ?? (demo ? join(demoDir, 'playwright.config.ts') : undefined),
    app: v.app ?? (demo ? join(demoDir, 'app') : undefined),
    mutants: v.mutants ?? (demo ? join(demoDir, 'workers.mutants.json') : undefined),
    url: v.url,
    out: v.out,
    grep: v.grep,
    maxTests: v['max-tests'] ? Number(v['max-tests']) : undefined,
    repairRounds: Number(v['repair-rounds']),
    agent: v.agent,
    agentModel: v['agent-model'],
    dryRun: v['dry-run'],
    resume: v.resume,
  };
  for (const k of ['config', 'app', 'mutants']) {
    if (!opts[k]) {
      console.error(`Missing --${k}.\n\n${HELP}`);
      process.exit(2);
    }
  }
  try {
    await port(opts);
  } catch (e) {
    console.error(`\nworkers: ${e.message}`);
    process.exit(1);
  }
}

main();
