import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { adapters, resolveAgent } from './agents.js';
import { restoreCache, snapshotCache, withRestoredCache } from './kane-cache.js';
import { listTests } from './inventory.js';
import { repairLoop } from './loop.js';
import { computeCells } from './parity.js';
import { doneLine, writeReport } from './report.js';
import { runKane } from './run-kane.js';
import { runPlaywright } from './run-playwright.js';
import { ensureServer } from './server.js';
import { installSigintHandler, loadMutants, restoreLeftovers, withMutant } from './mutants.js';
import { collectImports, countExpects, extractSource, formatImports, translateTest } from './translate.js';
import { slugify } from './util.js';

const CREDITS_PER_AUTHOR = 40;
const CREDITS_PER_HEALED_RUN = '10-30';
const lines = (s) => s.trim().split('\n').length;

// Plain-text matrix of the Playwright verdicts (used for the dry run).
export function pwMatrixText(states, mutants) {
  const cols = ['clean', ...mutants.map((m) => m.id)];
  const w = Math.max(...states.map((s) => s.test.title.length), 4);
  const row = (name, cells) => name.padEnd(w) + '  ' + cells.map((c) => c.padEnd(5)).join(' ');
  return [row('test', cols), ...states.map((s) => row(s.test.title, cols.map((c) => (s.pw[c].passed ? 'pass' : 'FAIL'))))].join('\n');
}

export async function port(opts) {
  const log = opts.log ?? console.log;
  const config = resolve(opts.config);
  const appDir = resolve(opts.app);
  const outDir = resolve(opts.out ?? 'workers-out');

  const restored = restoreLeftovers(appDir);
  if (restored.length) log(`Restored ${restored.length} file(s) left mutated by an interrupted run: ${restored.join(', ')}`);
  const mutants = loadMutants(resolve(opts.mutants));
  const stopSigint = installSigintHandler();

  let stopServer = async () => {};
  try {
    // 1. inventory
    log('Listing Playwright tests ...');
    const inv = await listTests(config);
    let tests = inv.tests;
    if (opts.grep) {
      const wanted = opts.grep.toLowerCase().split('|').map((s) => s.trim()).filter(Boolean);
      tests = tests.filter((t) => wanted.some((w) => t.titlePath.join(' ').toLowerCase().includes(w)));
    }
    if (opts.maxTests) tests = tests.slice(0, opts.maxTests);
    if (!tests.length) throw new Error('No Playwright tests selected (check --grep / --config).');
    log(`Found ${inv.tests.length} tests, selected ${tests.length}:`);
    tests.forEach((t, i) => log(`  ${i + 1}. ${t.titlePath.join(' > ')}`));
    log(`Mutants: ${mutants.map((m) => `${m.id} (${m.kind})`).join(', ')}`);
    const url = opts.url ?? (inv.webServer?.url ? inv.webServer.url.replace(/\/?$/, '/') : 'http://localhost:4173/');

    // 2. translate
    const agent = opts.agentImpl ?? (await resolveAgent(opts.agent ?? 'claude', log, adapters));
    log(`Translating with ${agent.name}${opts.agentModel ? ` (${opts.agentModel})` : ''} ...`);
    const states = [];
    for (const [i, test] of tests.entries()) {
      const src = readFileSync(test.file, 'utf8');
      const { source, testBlock } = extractSource(src, test.line);
      const slug = `${String(i + 1).padStart(2, '0')}-${slugify(test.title)}`;
      const mdPath = join(outDir, 'tests', slug, `${slug}_test.md`);
      log(`  [${i + 1}/${tests.length}] ${test.title}`);
      let md;
      if (opts.resume && existsSync(mdPath)) {
        // --resume: keep the translation from an interrupted run, so Kane replays its recordings instead of re-authoring
        md = readFileSync(mdPath, 'utf8');
        log(`      reused ${mdPath}`);
      } else {
        const r = await translateTest({ test, url, agent, model: opts.agentModel });
        md = r.md;
        mkdirSync(dirname(mdPath), { recursive: true });
        writeFileSync(mdPath, md);
        log(`      wrote ${mdPath}${r.attempts > 1 ? ' (needed a retry)' : ''}`);
      }
      states.push({ test, slug, mdPath, md, pwSource: source, pwImports: formatImports(collectImports(test.file)), pwLines: lines(testBlock), mdLines: lines(md), pw: {}, kane: {}, cells: {}, loop: [], credits: 0, status: 'translated' });
    }

    // 3. Playwright matrix: one run per column
    log('Playwright: clean run ...');
    const clean = await runPlaywright(config, tests);
    states.forEach((s) => (s.pw.clean = clean[s.test.id]));
    for (const m of mutants) {
      log(`Playwright: mutant ${m.id} (${m.kind}) ...`);
      const res = await withMutant(appDir, m, () => runPlaywright(config, tests));
      states.forEach((s) => (s.pw[m.id] = res[s.test.id]));
      log(`  fails ${states.filter((s) => !s.pw[m.id].passed).length} of ${states.length} selected tests`);
    }
    states.forEach((s) => (s.cells = computeCells(mutants, s.pw, null)));
    log('\nPlaywright matrix (old suite):\n' + pwMatrixText(states, mutants) + '\n');

    const eligible = states.filter((s) => s.pw.clean.passed);
    states.filter((s) => !s.pw.clean.passed).forEach((s) => ((s.status = 'old-test-failing'), log(`  ! "${s.test.title}" fails on the clean app in Playwright; excluded.`)));

    const build = () => ({
      generatedAt: new Date().toISOString(),
      dryRun: !!opts.dryRun,
      mutants: mutants.map(({ id, kind, description }) => ({ id, kind, description })),
      tests: states.map((s) => ({ id: s.test.id, title: s.test.title, status: s.status, reason: s.reason, cells: s.cells, pw: s.pw, kane: s.kane, loop: s.loop, pwLines: s.pwLines, mdLines: s.mdLines, credits: s.credits, mdPath: s.mdPath })),
    });

    // dry run stops here
    if (opts.dryRun) {
      const reportPath = writeReport(outDir, build());
      log('Plan (dry run, Kane not executed):');
      log(`  1. Author ${eligible.length} test(s) on the clean app with Kane (about ${CREDITS_PER_AUTHOR} credits each)`);
      log(`  2. Run each against ${mutants.length} mutants with Kane's self-healing on, restoring its local cache around every run (clean replay: 0 credits; a run where Kane heals: about ${CREDITS_PER_HEALED_RUN} credits)`);
      log(`  3. Repair any test where Kane is weaker (up to ${opts.repairRounds ?? 2} rounds; each round re-authors, about ${CREDITS_PER_AUTHOR} credits)`);
      log(`  Estimated Kane credits: about ${eligible.length * CREDITS_PER_AUTHOR} for authoring (plus repairs)`);
      log(`Report (Playwright only): ${reportPath}`);
      return build();
    }

    // 4. Kane
    stopServer = await ensureServer({ url, command: inv.webServer?.command, cwd: inv.configDir });
    const kane = async (state, col) => {
      const r = await runKane(state.mdPath);
      state.kane[col] = r;
      state.credits += r.credits;
      if (r.status === 'error') throw new Error(`Kane could not run (${r.errorText ?? 'exit ' + r.exitCode}). If this is an auth problem, run \`kane-cli login\`.`);
      return r;
    };
    const verdict = (r) => (r.status === 'passed' ? 'pass' : 'FAIL') + (r.healTriggered ? ' (healed)' : '');
    // Mutant run: the test's Kane cache is restored before and after, also if the run throws.
    const kaneMutant = (state, m) => withRestoredCache(state.mdPath, outDir, () => kane(state, m.id));
    // Clean authoring run: on a pass, snapshot the cache for later restores.
    const kaneClean = async (state) => {
      restoreCache(state.mdPath, outDir); // reset to the last snapshot, if any
      const r = await kane(state, 'clean');
      if (r.status === 'passed') snapshotCache(state.mdPath, outDir);
      return r;
    };

    for (const [i, s] of eligible.entries()) {
      log(`Kane: authoring on the clean app [${i + 1}/${eligible.length}] ${s.test.title}`);
      const r = await kaneClean(s);
      log(`  ${verdict(r)} (${r.credits.toFixed(1)} credits)${r.failedStep ? ': ' + r.failedStep.summary : ''}`);
    }
    for (const m of mutants) {
      log(`Kane: running against mutant ${m.id} (self-healing on) ...`);
      await withMutant(appDir, m, async () => {
        for (const s of eligible.filter((x) => x.kane.clean.status === 'passed')) {
          const r = await kaneMutant(s, m);
          log(`  ${s.test.title}: ${verdict(r)}`);
        }
      });
    }
    const recompute = (s) => (s.cells = computeCells(mutants, s.pw, s.kane));
    eligible.forEach(recompute);

    // 5. repair loop
    const evaluate = async (s) => {
      s.kane = {};
      await kaneClean(s); // a pass takes a fresh snapshot
      if (s.kane.clean.status === 'passed') {
        for (const m of mutants) await withMutant(appDir, m, () => kaneMutant(s, m));
      }
      recompute(s);
    };
    for (const s of eligible) {
      await repairLoop(s, mutants, {
        rounds: opts.repairRounds ?? 2,
        agent,
        model: opts.agentModel,
        writeMd: (st, md) => {
          writeFileSync(st.mdPath, md);
          st.mdLines = lines(md);
        },
        evaluate,
        log,
      });
      if (s.status === 'translated') s.status = 'ported';
    }

    const reportPath = writeReport(outDir, build());
    const h = JSON.parse(readFileSync(join(outDir, 'report.json'), 'utf8')).headline;
    log('\n' + doneLine(h));
    log(`Report: ${reportPath}`);
    return build();
  } finally {
    await stopServer();
    stopSigint();
    // belt and braces: nothing may stay mutated
    restoreLeftovers(appDir);
  }
}
