#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { port } from '../src/port.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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
  const opts = {
    config: v.config ?? (demo ? join(root, 'demo', 'playwright.config.ts') : undefined),
    app: v.app ?? (demo ? join(root, 'demo', 'app') : undefined),
    mutants: v.mutants ?? (demo ? join(root, 'demo', 'workers.mutants.json') : undefined),
    url: v.url,
    out: v.out,
    grep: v.grep,
    maxTests: v['max-tests'] ? Number(v['max-tests']) : undefined,
    repairRounds: Number(v['repair-rounds']),
    agent: v.agent,
    agentModel: v['agent-model'],
    dryRun: v['dry-run'],
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
