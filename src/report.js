import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function headline(report) {
  const bug = report.mutants.filter((m) => m.kind === 'bug').map((m) => m.id);
  const refactor = report.mutants.filter((m) => m.kind === 'refactor').map((m) => m.id);
  const tests = report.tests.filter((t) => t.status !== 'old-test-failing');
  const count = (ids, pred) => tests.reduce((n, t) => n + ids.filter((id) => pred(t, id)).length, 0);
  return {
    testsSelected: report.tests.length,
    testsPorted: tests.filter((t) => t.kane?.clean?.status === 'passed').length,
    bugCells: count(bug, () => true),
    bugsCaughtOld: count(bug, (t, id) => t.pw[id] && !t.pw[id].passed),
    bugsCaughtNew: count(bug, (t, id) => t.kane?.[id]?.status === 'failed'),
    falseAlarmsAvoided: count(refactor, (t, id) => t.cells[id] === 'false-alarm-avoided'),
    kaneStronger: count(bug, (t, id) => t.cells[id] === 'kane-stronger'),
    needsHuman: tests.filter((t) => t.status === 'needs-human').length,
    pwLines: report.tests.reduce((n, t) => n + (t.pwLines || 0), 0),
    mdLines: report.tests.reduce((n, t) => n + (t.mdLines || 0), 0),
    credits: Math.round(report.tests.reduce((n, t) => n + (t.credits || 0), 0) * 10) / 10,
  };
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mark = (v) => (v === undefined ? '-' : v === true || v === 'passed' ? 'pass' : v === false || v === 'failed' ? 'FAIL' : v);

export function renderHtml(report) {
  const h = report.headline;
  const cols = ['clean', ...report.mutants.map((m) => m.id)];
  const head = cols.map((c) => {
    const m = report.mutants.find((x) => x.id === c);
    return `<th title="${esc(m ? m.description : 'unchanged app')}">${esc(c)}${m ? `<br><small>${m.kind}</small>` : ''}</th>`;
  }).join('');
  const rows = report.tests.map((t) => {
    const cells = cols.map((c) => {
      const cls = t.cells[c] ?? 'excluded';
      const pw = t.pw[c] ? mark(t.pw[c].passed) : '-';
      const kane = t.kane?.[c] ? mark(t.kane[c].status) : '-';
      const link = t.kane?.[c]?.shareUrl && t.kane[c].shareUrl !== 'REDACTED' ? ` <a href="${esc(t.kane[c].shareUrl)}">run</a>` : '';
      return `<td class="${esc(cls)}"><b>${esc(cls)}</b><br><small>PW ${pw} / Kane ${kane}${link}</small></td>`;
    }).join('');
    return `<tr><th class="t">${esc(t.title)}${t.status === 'needs-human' ? `<br><small class="nh">needs human: ${esc(t.reason)}</small>` : ''}</th>${cells}</tr>`;
  }).join('');
  const loops = report.tests.filter((t) => t.loop?.length).map((t) => `<h3>${esc(t.title)} <small>(${esc(t.status)})</small></h3>${t.loop.map((r) => `<div class="round"><b>Round ${r.round}</b> weaker on: ${esc(r.weakOn.join(', '))}${r.error ? `<p class="nh">${esc(r.error)}</p>` : ''}<pre>${esc(r.change || '(no change)')}</pre><small>after: ${esc(Object.entries(r.after).map(([k, v]) => `${k}=${v}`).join(', '))}</small></div>`).join('')}`).join('') || '<p>No repair rounds were needed.</p>';
  const stat = (n, label) => `<div class="stat"><b>${esc(n)}</b><span>${esc(label)}</span></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workers report</title><style>
:root{--bg:#fff;--fg:#1a1a1a;--mut:#666;--line:#ddd}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--fg:#eee;--mut:#999;--line:#333}}
body{font:14px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--fg);margin:0 auto;max-width:1200px;padding:24px 16px}
h1{margin:0 0 4px}.sub{color:var(--mut);margin-bottom:24px}
.stats{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px}.stat{border:1px solid var(--line);border-radius:8px;padding:10px 14px;min-width:130px}
.stat b{display:block;font-size:22px}.stat span{color:var(--mut);font-size:12px}
.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th.t{min-width:220px;font-weight:500}small{color:var(--mut)}.nh{color:#b3261e}
td.ok,td.parity,td.parity-caught{background:#e3f4e6;color:#14401c}td.false-alarm-avoided,td.kane-stronger{background:#d9ecfb;color:#0b3350}
td.parity-missed{background:#f1f1f1;color:#333}td.kane-weaker,td.broken-on-clean,td.kane-false-alarm,td.error{background:#fbe0dd;color:#5c1410}
td.old-test-failing,td.excluded,td.pw-only{background:#f7f2dc;color:#4d4310}
@media (prefers-color-scheme:dark){td{color:#111}}
pre{background:rgba(127,127,127,.12);padding:8px;border-radius:6px;overflow-x:auto;white-space:pre-wrap}.round{margin:8px 0}
</style></head><body>
<h1>Workers report</h1><div class="sub">${esc(report.generatedAt)}${report.dryRun ? ' &middot; dry run (Kane not executed)' : ''}</div>
<div class="stats">${[
    stat(`${h.testsPorted}/${h.testsSelected}`, 'tests ported'),
    stat(`${h.bugsCaughtOld} / ${h.bugsCaughtNew}`, `bug mutants caught (old / new) of ${h.bugCells}`),
    stat(h.falseAlarmsAvoided, 'false alarms avoided'),
    stat(h.kaneStronger, 'kane-stronger findings'),
    stat(h.needsHuman, 'needs human'),
    stat(`${h.pwLines} to ${h.mdLines}`, 'lines: Playwright to _test.md'),
    stat(h.credits, 'Kane credits used'),
  ].join('')}</div>
<h2>Matrix</h2><div class="scroll"><table><tr><th>Test</th>${head}</tr>${rows}</table></div>
<h2>Repair loop</h2>${loops}
<h2>Mutants</h2><ul>${report.mutants.map((m) => `<li><b>${esc(m.id)}</b> (${m.kind}): ${esc(m.description)}</li>`).join('')}</ul>
</body></html>`;
}

export function writeReport(outDir, report) {
  mkdirSync(outDir, { recursive: true });
  report.headline = headline(report);
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(outDir, 'report.html'), renderHtml(report));
  return join(outDir, 'report.html');
}
