// PURE: turn a Playwright verdict and a Kane verdict into a cell class. No I/O, no LLM.
// column: 'clean' | 'bug' | 'refactor'.  pwPassed: boolean.  kane: 'passed' | 'failed' | 'error' | undefined (not run).
export function classify(column, pwPassed, kane) {
  if (kane === undefined || kane === null) return 'pw-only';
  if (kane === 'error') return 'error';
  const kanePassed = kane === 'passed';
  if (column === 'clean') {
    if (!pwPassed) return 'old-test-failing';
    return kanePassed ? 'ok' : 'broken-on-clean';
  }
  if (column === 'bug') {
    if (!pwPassed && !kanePassed) return 'parity-caught';
    if (pwPassed && kanePassed) return 'parity-missed';
    if (!pwPassed && kanePassed) return 'kane-weaker';
    return 'kane-stronger';
  }
  if (column === 'refactor') {
    if (!kanePassed) return 'kane-false-alarm';
    return pwPassed ? 'parity' : 'false-alarm-avoided';
  }
  throw new Error(`Unknown column "${column}"`);
}

// Does this test need a repair round? (kane-weaker on any bug mutant, or broken on clean)
export function needsRepair(cells) {
  return Object.values(cells).some((c) => c === 'kane-weaker' || c === 'broken-on-clean');
}

// cells for one test: {clean: class, [mutantId]: class}
export function computeCells(mutants, pw, kane) {
  const cells = { clean: classify('clean', pw.clean.passed, kane?.clean?.status) };
  for (const m of mutants) {
    // Kane is only run on mutants when it passed on clean; otherwise the mutant cell is not evaluated
    const k = cells.clean === 'ok' ? kane?.[m.id]?.status : undefined;
    cells[m.id] = cells.clean === 'old-test-failing' ? 'excluded' : classify(m.kind, pw[m.id].passed, k);
  }
  return cells;
}
