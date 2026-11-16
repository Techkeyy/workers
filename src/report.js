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
    kaneWeaker: count(bug, (t, id) => t.cells[id] === 'kane-weaker'),
    kaneFalseAlarms: count(refactor, (t, id) => t.cells[id] === 'kane-false-alarm'),
    needsHuman: tests.filter((t) => t.status === 'needs-human').length,
    pwLines: report.tests.reduce((n, t) => n + (t.pwLines || 0), 0),
    mdLines: report.tests.reduce((n, t) => n + (t.mdLines || 0), 0),
    credits: Math.round(report.tests.reduce((n, t) => n + (t.credits || 0), 0) * 10) / 10,
  };
}

// The "Done." console line; every outcome is counted separately so nothing is hidden.
export const doneLine = (h) => `Done. ${h.testsPorted}/${h.testsSelected} ported; bug mutants caught old/new: ${h.bugsCaughtOld}/${h.bugsCaughtNew} (kane-stronger ${h.kaneStronger}, kane-weaker ${h.kaneWeaker}); refactors: false-alarm-avoided ${h.falseAlarmsAvoided}, kane-false-alarm ${h.kaneFalseAlarms}; needs human: ${h.needsHuman}; Kane credits: ${h.credits}`;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Cell class -> plain words plus a tone. Tone drives colour, the words carry the meaning.
const CLASSES = {
  ok: ['both pass', 'good'],
  parity: ['both pass', 'good'],
  'parity-caught': ['both caught', 'good'],
  'false-alarm-avoided': ['false alarm avoided', 'win'],
  'kane-stronger': ['Kane stronger', 'win'],
  'parity-missed': ['neither caught', 'neutral'],
  'kane-weaker': ['Kane weaker', 'bad'],
  'broken-on-clean': ['Kane fails on clean', 'bad'],
  'kane-false-alarm': ['Kane false alarm', 'bad'],
  error: ['Kane error', 'bad'],
  'old-test-failing': ['old test fails on clean', 'neutral'],
  excluded: ['excluded', 'neutral'],
  'pw-only': ['Kane not run', 'neutral'],
};
const label = (cls) => (CLASSES[cls] ? CLASSES[cls][0] : String(cls));
const tone = (cls) => (CLASSES[cls] ? CLASSES[cls][1] : 'neutral');

const verdictGlyph = (v) => (v === undefined || v === null ? 'not run' : v === true || v === 'passed' ? '✓ pass' : v === false || v === 'failed' ? '✗ fail' : String(v));

// The relative path of a _test.md inside the output folder, for links in the HTML.
const relPath = (p) => {
  const s = String(p ?? '').replace(/\\/g, '/');
  const i = s.lastIndexOf('tests/');
  return i >= 0 ? s.slice(i) : s;
};

// One honest sentence built from the numbers. Bad news is stated before good news is allowed to stand alone.
export function verdictSentence(report) {
  const h = report.headline || headline(report);
  if (report.dryRun) return `Dry run: ${plural(h.testsSelected, 'Playwright test', 'Playwright tests')} listed and old-suite verdicts recorded. Kane was not executed, so nothing is proven yet.`;
  const cellsOf = (cls) => report.tests.reduce((n, t) => n + Object.values(t.cells || {}).filter((c) => c === cls).length, 0);
  const both = cellsOf('parity-caught');
  // A bug escaped only if no test, old or new, failed on it.
  const missedBoth = report.mutants.filter((m) => m.kind === 'bug' && report.tests.every((t) => t.pw?.[m.id]?.passed !== false && t.kane?.[m.id]?.status !== 'failed')).length;
  const out = [`${h.testsPorted} of ${plural(h.testsSelected, 'Playwright test', 'Playwright tests')} ported to Kane.`];
  if (h.bugsCaughtOld === 0) out.push(`The old suite caught none of the ${h.bugCells} planted bugs, so there is no baseline to match.`);
  else if (h.kaneWeaker === 0) out.push(`Kane caught every bug the old suite caught (${both}/${h.bugsCaughtOld}).`);
  else out.push(`Kane missed ${plural(h.kaneWeaker, 'bug', 'bugs')} the old suite caught (Kane matched ${both} of ${h.bugsCaughtOld}).`);
  if (h.kaneStronger > 0) out.push(`Kane also caught ${plural(h.kaneStronger, 'bug', 'bugs')} the old suite missed.`);
  if (missedBoth > 0) out.push(`${plural(missedBoth, 'planted bug', 'planted bugs')} slipped past every test in both suites.`);
  if (h.falseAlarmsAvoided > 0) out.push(`Kane avoided ${plural(h.falseAlarmsAvoided, 'false alarm', 'false alarms')} the old suite raised.`);
  if (h.kaneFalseAlarms > 0) out.push(`Kane raised ${plural(h.kaneFalseAlarms, 'false alarm', 'false alarms')} on harmless refactors.`);
  if (h.needsHuman > 0) out.push(`${plural(h.needsHuman, 'test still needs', 'tests still need')} a human.`);
  return out.join(' ');
}

const diffHtml = (text) => {
  const lines = String(text || '(no change)').split('\n').map((l) => `<span class="dl ${l.startsWith('+') ? 'add' : l.startsWith('-') ? 'del' : ''}">${esc(l) || ' '}</span>`);
  return `<pre class="diff" tabindex="0">${lines.join('')}</pre>`;
};

const CSS = `
:root{--bg:#f6f4ef;--surface:#fffdf9;--sub:#efece4;--line:#d9d4c7;--fg:#1d1b16;--mut:#58544a;--accent:#1f4f8f;
--good-bg:#e1efe2;--good-fg:#173d1f;--win-bg:#dbe8f7;--win-fg:#0e2f55;--bad-bg:#f8dcd6;--bad-fg:#5a130c;--neu-bg:#ebe8df;--neu-fg:#3a372f;
--add:#17622a;--del:#9a1f14;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#14130f;--surface:#1c1b16;--sub:#25231d;--line:#3a372e;--fg:#efece3;--mut:#b2ad9f;--accent:#8db6f0;
--good-bg:#1b3321;--good-fg:#bfe6c6;--win-bg:#17304d;--win-fg:#bcd8f6;--bad-bg:#4a1d18;--bad-fg:#f6c9c1;--neu-bg:#2a2821;--neu-fg:#d2cdbf;--add:#7fd391;--del:#f29a8f}}
*{box-sizing:border-box}
body{font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--fg);margin:0}
.wrap{max-width:1240px;margin:0 auto;padding:24px 16px 48px}
a{color:var(--accent)}a:focus-visible,pre:focus-visible,.scroll:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.brand{font-weight:700;letter-spacing:.02em;margin:0 0 16px;font-size:15px;color:var(--mut)}
.brand span{color:var(--fg)}
.verdict{margin:0 0 8px;padding:20px 22px;border-left:8px solid var(--accent);background:var(--surface);border-radius:0 8px 8px 0}
.verdict.bad{border-color:var(--del)}.verdict.good{border-color:var(--add)}
.verdict .tag{display:block;font-size:14px;font-weight:700;color:var(--mut);margin-bottom:6px}
.verdict p{margin:0;font-size:clamp(20px,3.2vw,28px);line-height:1.3;font-weight:600;max-width:60ch}
.when{color:var(--mut);font-size:14px;margin:0 0 24px}
h2{font-size:20px;margin:40px 0 12px}
h2 small{font-weight:400;font-size:15px;color:var(--mut);margin-left:8px}
.tiles{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--surface)}
.tile{padding:14px 16px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);margin:0 -1px -1px 0}
.tile b{display:block;font-size:30px;line-height:1.15;font-variant-numeric:tabular-nums}
.tile span{font-size:14px;color:var(--mut)}
@media (max-width:1100px){.tiles{grid-template-columns:repeat(4,minmax(0,1fr))}.tile:last-child{grid-column:span 2}}
@media (max-width:560px){.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.tile:last-child{grid-column:span 2}}
.tile.alert b{color:var(--del)}
.scroll{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:var(--surface)}
table{border-collapse:separate;border-spacing:0;width:100%;font-size:14px}
th,td{padding:10px 12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line);border-right:1px solid var(--line)}
tr>*:last-child{border-right:0}tbody tr:last-child>*{border-bottom:0}
thead th{background:var(--sub);font-weight:600;white-space:nowrap}
thead th small,td small{display:block;font-weight:400;color:var(--mut);font-size:13px}
th.t{min-width:230px;font-weight:600;position:sticky;left:0;background:var(--surface);z-index:1}
thead th.t{background:var(--sub)}
td{min-width:150px}
td .cls{display:block;font-weight:700;font-size:14px}
td .pair{font-size:13px;display:block;margin-top:2px;font-variant-numeric:tabular-nums}
td.good{background:var(--good-bg);color:var(--good-fg)}td.win{background:var(--win-bg);color:var(--win-fg)}td.bad{background:var(--bad-bg);color:var(--bad-fg)}td.neutral{background:var(--neu-bg);color:var(--neu-fg)}
td small,td a{color:inherit}
td.bad .cls::before{content:"! "}
.heal{display:inline-block;font-size:13px;font-weight:600;border:1px solid currentColor;border-radius:4px;padding:0 6px;margin-top:4px}
.nh{color:var(--del);font-weight:600}
.legend{list-style:none;margin:16px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px 24px}
.legend li{font-size:15px}.legend b{font-family:var(--mono);font-size:14px;margin-right:6px}
.legend .k{display:inline-block;font-size:13px;font-weight:600;color:var(--mut);margin-right:6px}
.note{color:var(--mut);font-size:15px;max-width:70ch;margin:8px 0 0}
.empty{background:var(--surface);border:1px dashed var(--line);border-radius:8px;padding:16px;margin:0;max-width:70ch}
.loop h3{font-size:17px;margin:24px 0 8px}.loop h3 small{font-weight:400;color:var(--mut);font-size:15px}
.round{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:14px 16px;margin:0 0 12px}
.round h4{margin:0 0 6px;font-size:15px}
.round p{margin:4px 0;font-size:15px}
pre.diff{margin:8px 0;padding:10px 0;background:var(--sub);border-radius:6px;overflow-x:auto;font:13px/1.5 var(--mono)}
.dl{display:block;padding:0 12px;white-space:pre}.dl.add{color:var(--add);background:rgba(23,98,42,.1)}.dl.del{color:var(--del);background:rgba(154,31,20,.1)}
.after{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0;padding:0;list-style:none}
.after li{font-size:13px;padding:2px 8px;border-radius:4px;font-weight:600}
.after li.good{background:var(--good-bg);color:var(--good-fg)}.after li.win{background:var(--win-bg);color:var(--win-fg)}.after li.bad{background:var(--bad-bg);color:var(--bad-fg)}.after li.neutral{background:var(--neu-bg);color:var(--neu-fg)}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tfoot td{font-weight:700;background:var(--sub)}
footer{margin-top:48px;padding-top:20px;border-top:1px solid var(--line);color:var(--mut);font-size:15px;max-width:75ch}
footer h2{font-size:16px;margin:0 0 6px;color:var(--fg)}
footer p{margin:0}
@media (max-width:760px){
.scroll.mx{border:0;background:none;overflow:visible}
table.matrix,table.matrix tbody,table.matrix tr,table.matrix td,table.matrix th{display:block;width:100%}
table.matrix thead{position:absolute;left:-9999px}
table.matrix tr{background:var(--surface);border:1px solid var(--line);border-radius:8px;margin:0 0 14px;overflow:hidden}
table.matrix th.t{position:static;min-width:0;border-right:0;background:var(--sub)}
table.matrix td{min-width:0;border-right:0;padding:10px 14px}
table.matrix td::before{content:attr(data-col);display:block;font-size:13px;font-weight:700;margin-bottom:2px}
.tile b{font-size:26px}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

export function renderHtml(report) {
  const h = report.headline || headline(report);
  const cols = ['clean', ...report.mutants.map((m) => m.id)];
  const mutantOf = (c) => report.mutants.find((x) => x.id === c);
  const colTitle = (c) => (mutantOf(c) ? mutantOf(c).description : 'The unchanged app');

  const head = cols.map((c) => {
    const m = mutantOf(c);
    return `<th scope="col" title="${esc(colTitle(c))}">${esc(c)}<small>${m ? esc(m.kind) : 'baseline'}</small></th>`;
  }).join('');

  const rows = report.tests.map((t) => {
    const cells = cols.map((c) => {
      const cls = t.cells?.[c] ?? 'excluded';
      const pw = verdictGlyph(t.pw?.[c] ? t.pw[c].passed : undefined);
      const kane = verdictGlyph(t.kane?.[c] ? t.kane[c].status : undefined);
      const url = t.kane?.[c]?.shareUrl;
      const link = typeof url === 'string' && /^https?:\/\//i.test(url) ? ` <a href="${esc(url)}">run</a>` : '';
      const healed = t.kane?.[c]?.healTriggered ? '<span class="heal">healed</span>' : '';
      return `<td class="${esc(cls)} ${tone(cls)}" data-col="${esc(c)}${mutantOf(c) ? ` (${esc(mutantOf(c).kind)})` : ' (clean app)'}"><span class="cls">${esc(label(cls))}</span><span class="pair">PW ${pw} &middot; Kane ${kane}${link}</span>${healed}</td>`;
    }).join('');
    return `<tr><th scope="row" class="t">${esc(t.title)}${t.status === 'needs-human' ? `<small class="nh">needs human: ${esc(t.reason)}</small>` : ''}</th>${cells}</tr>`;
  }).join('');

  const legend = report.mutants.map((m) => `<li><b>${esc(m.id)}</b><span class="k">${esc(m.kind)}</span>${esc(m.description)}</li>`).join('');

  const loops = report.tests.filter((t) => t.loop?.length).map((t) => `<h3>${esc(t.title)} <small>(${esc(t.status)})</small></h3>${t.loop.map((r) => `<div class="round"><h4>Round ${esc(r.round)}</h4><p><b>Weaker on:</b> ${esc((r.weakOn || []).join(', '))}</p>${r.error ? `<p class="nh">Agent error: ${esc(r.error)}</p>` : ''}<p><b>Agent change to the _test.md:</b></p>${diffHtml(r.change)}<p><b>Verdicts after:</b></p><ul class="after">${Object.entries(r.after || {}).map(([k, v]) => `<li class="${tone(v)}">${esc(k)}: ${esc(label(v))}</li>`).join('')}</ul></div>`).join('')}`).join('')
    || '<p class="empty">No repairs were needed: every ported test matched the old suite on the first try.</p>';

  const stat = (n, text, alert) => `<div class="tile${alert ? ' alert' : ''}"><b>${esc(n)}</b><span>${esc(text)}</span></div>`;
  const bad = h.kaneWeaker > 0 || h.kaneFalseAlarms > 0 || h.needsHuman > 0 || report.dryRun;
  const beforeAfter = report.tests.map((t) => `<tr><th scope="row" class="t">${esc(t.title)}</th><td class="num">${esc(t.pwLines || 0)}</td><td class="num">${esc(t.mdLines || 0)}</td><td>${t.mdPath ? `<a href="${esc(relPath(t.mdPath))}">${esc(relPath(t.mdPath))}</a>` : 'not written'}</td></tr>`).join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>Workers report</title><style>${CSS}</style></head><body><div class="wrap">
<p class="brand"><span>Workers</span> port report</p>
<section class="verdict ${bad ? 'bad' : 'good'}" aria-label="Verdict"><span class="tag">${report.dryRun ? 'Dry run, Kane not executed' : bad ? 'Not fully proven' : 'Proven on this run'}</span><p>${esc(verdictSentence({ ...report, headline: h }))}</p></section>
<p class="when">Generated ${esc(report.generatedAt)}</p>
<div class="tiles" role="list">${[
    stat(`${h.testsPorted}/${h.testsSelected}`, 'tests ported'),
    stat(`${h.bugsCaughtOld} vs ${h.bugsCaughtNew}`, `bugs caught, old vs new (of ${h.bugCells} test and bug pairs)`),
    stat(h.falseAlarmsAvoided, 'false alarms avoided'),
    stat(h.kaneStronger, 'Kane stronger'),
    stat(h.kaneWeaker, 'Kane weaker', h.kaneWeaker > 0),
    stat(h.needsHuman, 'needs human', h.needsHuman > 0),
    stat(h.credits, 'Kane credits used'),
  ].join('')}</div>
${h.kaneFalseAlarms > 0 ? `<p class="note nh">Kane raised ${plural(h.kaneFalseAlarms, 'false alarm', 'false alarms')} on harmless refactors.</p>` : ''}
<h2>Matrix <small>Playwright (PW) vs Kane, per test and per break</small></h2>
<div class="scroll mx" tabindex="0" role="region" aria-label="Test by mutant matrix"><table class="matrix"><thead><tr><th scope="col" class="t">Test</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">healed = Kane's self-healing re-authored a step during this run. Each cell shows the verdict of both suites and the outcome in words.</p>
<ul class="legend" aria-label="Mutant legend"><li><b>clean</b><span class="k">baseline</span>The unchanged app. Both suites must pass.</li>${legend}</ul>
<h2>Repair loop</h2><div class="loop">${loops}</div>
<h2>Before and after</h2>
<div class="scroll" tabindex="0" role="region" aria-label="Line counts and test files"><table><thead><tr><th scope="col" class="t">Test</th><th scope="col" class="num">Playwright lines</th><th scope="col" class="num">_test.md lines</th><th scope="col">Ported file</th></tr></thead><tbody>${beforeAfter}</tbody><tfoot><tr><th scope="row" class="t">Total</th><td class="num">${esc(h.pwLines)}</td><td class="num">${esc(h.mdLines)}</td><td></td></tr></tfoot></table></div>
<footer><h2>How this was checked</h2><p>Mutants are deliberate breaks planted in the app: bugs change behaviour, refactors change only markup. The same command runs both suites against every mutant, and each verdict comes from exit codes and run results, never from the agent's word. The coding agent never sees the mutant, only what the old test asserted and what Kane did, so it cannot tune a test to the break.</p></footer>
</div></body></html>`;
}

export function writeReport(outDir, report) {
  mkdirSync(outDir, { recursive: true });
  report.headline = headline(report);
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(outDir, 'report.html'), renderHtml(report));
  return join(outDir, 'report.html');
}
