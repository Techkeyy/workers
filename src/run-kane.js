import { basename, dirname } from 'node:path';
import { run } from './util.js';

// Parse Kane --agent NDJSON (ignores non-JSON lines) into a result object.
export function parseKane(text, exitCode) {
  const events = [];
  for (const line of String(text).split('\n')) {
    const s = line.trim();
    if (!s.startsWith('{')) continue;
    try {
      events.push(JSON.parse(s));
    } catch {}
  }
  const summary = events.find((e) => e.type === 'test_md_summary');
  const done = events.find((e) => e.type === 'test_md_done');
  const stepEnds = events.filter((e) => e.type === 'step_end');
  const runEnds = events.filter((e) => e.type === 'run_end');
  const failedStepEnd = stepEnds.find((e) => e.status === 'failed');
  const failedRun = runEnds.find((e) => e.status === 'failed');

  let status;
  if (exitCode === 0) status = summary?.overall_status === 'failed' ? 'failed' : summary || done ? 'passed' : 'error';
  else if (exitCode === 1) status = 'failed';
  else status = 'error';

  let failedStep = null;
  if (status === 'failed') {
    if (failedStepEnd) failedStep = { index: failedStepEnd.index, summary: failedStepEnd.summary };
    else if (failedRun) failedStep = { index: null, summary: failedRun.reason || failedRun.one_liner || 'run failed' };
  }

  return {
    status,
    exitCode,
    failedStep,
    stepSummaries: stepEnds.map((e) => `${e.status}: ${e.summary}`),
    runSummaries: runEnds.map((e) => [e.one_liner, e.summary, e.status === 'failed' ? e.reason : null].filter(Boolean).join(' | ')).filter(Boolean),
    credits: runEnds.reduce((n, e) => n + (Number(e.credits_consumed) || 0), 0),
    replayDecisions: summary?.steps?.replay_decisions ?? 0,
    authorDecisions: summary?.steps?.author_decisions ?? 0,
    healTriggered: summary?.adaptive_heal?.triggered === true,
    shareUrl: summary?.share_url ?? done?.share_url ?? null,
  };
}

// Run `kane-cli testmd run <file> --agent --headless` in the file's directory.
// noHeal=true for mutant runs (rule M1): a replay miss is terminal, free, and commits nothing.
export async function runKane(file, { noHeal = false, timeoutMs = 900000 } = {}) {
  const args = ['testmd', 'run', basename(file), '--agent', '--headless'];
  if (noHeal) args.push('--no-adaptive-heal');
  const r = await run('kane-cli', args, { cwd: dirname(file), env: { KANE_CLI_USER_AGENT: 'workers' }, timeoutMs });
  const result = parseKane(r.stdout, r.code);
  if (result.status === 'error' && !result.failedStep) {
    result.errorText = (r.stderr || '').trim().split('\n').slice(-2).join(' ') || `kane-cli exited with code ${r.code}`;
  }
  return result;
}
