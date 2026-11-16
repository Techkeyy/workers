document.documentElement.classList.add('js');
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Scroll reveals */
  var rv = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* Copy buttons */
  document.querySelectorAll('.copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy');
      var ok = function () {
        b.textContent = 'Copied'; b.classList.add('done');
        setTimeout(function () { b.textContent = 'Copy'; b.classList.remove('done'); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(ok, fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); ok(); } catch (e) { b.textContent = 'Press Ctrl+C'; }
        document.body.removeChild(ta);
      }
    });
  });

  /* Break-it replay. Verdicts are recorded values from workers-out/report.json (run 2, 16 Nov 2026). */
  var CHEESE = 'buy some cheese', CAT = 'feed the cat', DOC = 'book a doctors appointment';
  var T4 = 'display the current number of todo items';
  var M = [
    { id: 'B1', kind: 'bug', name: 'Wrong count', test: T4, pw: 'fail', kane: 'fail', cls: 'both',
      what: 'The counter counts completed items instead of active ones.',
      scene: { items: [[CHEESE, 0], [CAT, 1], [DOC, 0]], count: '1 item left', broken: 1, clear: 1 },
      note: 'One item is ticked. Expected "2 items left", the app shows "1 item left".' },
    { id: 'B2', kind: 'bug', name: 'Always plural', test: T4, pw: 'pass', kane: 'pass', cls: 'miss',
      what: 'The counter always says "items", so one item reads "1 items left".',
      scene: { items: [[CHEESE, 0]], count: '1 items left', broken: 1 },
      note: 'Expected "1 item left", the app shows "1 items left".' },
    { id: 'B3', kind: 'bug', name: 'Always singular', test: 'append new items to the bottom of the list', pw: 'fail', kane: 'fail', cls: 'repaired',
      what: 'The counter always says "item", so three items read "3 item left".',
      scene: { items: [[CHEESE, 0], [CAT, 0], [DOC, 0]], count: '3 item left', broken: 1 },
      note: 'Expected "3 items left", the app shows "3 item left".' },
    { id: 'B4', kind: 'bug', name: 'Clear removes the wrong items', test: 'remove completed items when clicked', pw: 'fail', kane: 'fail', cls: 'both',
      what: '"Clear completed" removes the active items and keeps the completed one.',
      scene: { items: [[CAT, 1]], count: '0 items left', broken: 1, clear: 1 },
      note: 'After clicking "Clear completed", only the completed item is left. The two active items are gone.' },
    { id: 'B5', kind: 'bug', name: 'Escape saves the edit', test: 'cancel edits on escape', pw: 'fail', kane: 'fail', cls: 'both',
      what: 'Pressing Escape while editing saves the change instead of cancelling it.',
      scene: { items: [[CHEESE, 0], ['feed the dog', 0, 1], [DOC, 0]], count: '3 items left' },
      note: 'Typed "feed the dog" over "feed the cat", pressed Escape. The edit should be cancelled, but it was saved.' },
    { id: 'R1', kind: 'refactor', name: 'Renamed test id', test: T4, pw: 'fail', kane: 'pass', cls: 'alarm',
      what: 'The counter\'s test id changes from todo-count to item-counter. Behaviour is identical.',
      scene: { items: [[CHEESE, 0], [CAT, 0], [DOC, 0]], count: '3 items left', flag: 'count', tag: 'item-counter' },
      note: 'Nothing visible changed. Only the hidden test id was renamed.' },
    { id: 'R2', kind: 'refactor', name: 'Extra button class', test: 'be hidden when there are no items that are completed', pw: 'pass', kane: 'pass', cls: 'quiet',
      what: 'The "Clear completed" button gains an extra class and data attribute. Behaviour is identical.',
      scene: { items: [[CHEESE, 0], [CAT, 1], [DOC, 0]], count: '2 items left', clear: 1, flag: 'clear', tag: 'extra class' },
      note: 'Nothing visible changed. The button only got an extra class.' }
  ];
  var VERDICT = {
    both: ['good', 'Both suites caught it', 'Playwright failed and Kane failed. For this bug, the ported test is as strong as the original.'],
    miss: ['warn', 'Both suites missed it', 'Playwright passed and Kane passed. None of the 6 ported tests noticed this planted bug. The report lists it as a gap in both suites.'],
    repaired: ['good', 'Kane missed it at first, then the repair loop fixed it', 'Playwright failed. The first Kane translation passed (a miss). After the agent rewrote the test, Kane failed on this bug, so it caught it.'],
    alarm: ['good', 'Playwright raised a false alarm. Kane did not.', 'Playwright failed because a test id was renamed, though the app behaves the same. Kane passed, which is the right answer.'],
    quiet: ['good', 'Both stayed green, correctly', 'The app behaves the same, and neither suite complained.']
  };
  var shown = {}, current = null;
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function html(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function drawScene(s, animate) {
    var g = $('scene'); while (g.firstChild) g.removeChild(g.firstChild);
    var y0 = 138, rh = 40, i;
    s.items.forEach(function (it, idx) {
      var y = y0 + idx * rh;
      g.appendChild(el('line', { 'class': 'a-row', x1: 1, x2: 339, y1: y - 22, y2: y - 22 }));
      g.appendChild(el('circle', { 'class': 'a-chk', cx: 36, cy: y - 5, r: 10 }));
      if (it[1]) g.appendChild(el('path', { 'class': 'a-tick', d: 'M30 ' + (y - 5) + 'l5 5 8-9' }));
      g.appendChild(el('text', { 'class': 'a-lbl' + (it[1] ? ' done' : ''), x: 58, y: y }, it[0]));
    });
    var fy = y0 + s.items.length * rh + 4;
    g.appendChild(el('line', { 'class': 'a-row', x1: 1, x2: 339, y1: fy - 24, y2: fy - 24 }));
    var c = el('text', { 'class': 'a-count' + (s.broken ? ' broken' : ''), x: 20, y: fy }, s.count);
    if (s.broken && animate && !reduce) c.setAttribute('class', 'a-count broken shake');
    g.appendChild(c);
    if (s.clear) g.appendChild(el('text', { 'class': 'a-clear', x: 320, y: fy, 'text-anchor': 'end' }, 'Clear completed'));
    g.appendChild(el('text', { 'class': 'a-foot', x: 170, y: fy + 30, 'text-anchor': 'middle' }, 'All   Active   Completed'));
    if (s.flag === 'count') {
      g.appendChild(el('rect', { 'class': 'a-flag', x: 14, y: fy - 20, width: 104, height: 28, rx: 5 }));
      g.appendChild(el('text', { 'class': 'a-tag', x: 14, y: fy + 46 }, 'data-testid="' + s.tag + '"'));
    } else if (s.flag === 'clear') {
      g.appendChild(el('rect', { 'class': 'a-flag', x: 204, y: fy - 20, width: 122, height: 28, rx: 5 }));
      g.appendChild(el('text', { 'class': 'a-tag', x: 326, y: fy + 46, 'text-anchor': 'end' }, s.tag));
    }
  }

  var CLEAN = { items: [[CHEESE, 0], [CAT, 0], [DOC, 0]], count: '3 items left' };

  function vtag(r) {
    var s = html('span', 'v ' + (r === 'fail' ? 'fail' : 'pass'), r === 'fail' ? 'FAIL' : 'PASS');
    return s;
  }

  function renderMatrix() {
    var tb = $('matrix-body'); tb.textContent = '';
    M.forEach(function (m) {
      var tr = document.createElement('tr');
      if (m.id === current) tr.className = 'sel';
      var show = shown[m.id];
      var td0 = html('td', '', m.id);
      var td1 = html('td', 't', m.test);
      var td2 = document.createElement('td'), td3 = document.createElement('td');
      if (show) {
        td2.appendChild(vtag(m.pw));
        if (m.cls === 'alarm') td2.appendChild(html('span', 'vsub', 'false alarm'));
        if (m.cls === 'miss') td2.appendChild(html('span', 'vsub', 'missed the bug'));
        td3.appendChild(vtag(m.kane));
        if (m.cls === 'repaired') td3.appendChild(html('span', 'vsub', 'first try: PASS (missed). After repair: FAIL (caught)'));
        if (m.cls === 'alarm') td3.appendChild(html('span', 'vsub', 'no false alarm'));
        if (m.cls === 'miss') td3.appendChild(html('span', 'vsub', 'missed the bug'));
      } else {
        td2.appendChild(html('span', 'v none', 'not shown'));
        td3.appendChild(html('span', 'v none', 'not shown'));
      }
      [td0, td1, td2, td3].forEach(function (t) { tr.appendChild(t); });
      tb.appendChild(tr);
    });
  }

  function renderVerdict(m) {
    var v = $('verdict'); v.textContent = '';
    if (!m) {
      v.className = 'verdict-box';
      v.appendChild(html('p', 'vh', 'No mutant applied'));
      v.appendChild(html('p', '', 'Each button applies one change from demo/workers.mutants.json and reveals the recorded verdicts below.'));
      return;
    }
    var d = VERDICT[m.cls];
    v.className = 'verdict-box ' + d[0];
    v.appendChild(html('p', 'vh', m.id + ': ' + d[1]));
    v.appendChild(html('p', '', m.what));
    v.appendChild(html('p', '', d[2]));
  }

  function select(id) {
    var m = M.filter(function (x) { return x.id === id; })[0];
    current = id; if (m) shown[id] = true;
    document.querySelectorAll('.mbtn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-id') === id));
    });
    drawScene(m ? m.scene : CLEAN, true);
    $('app-note').textContent = m ? m.note : 'Clean app. Pick a mutant above.';
    renderVerdict(m); renderMatrix();
  }

  M.forEach(function (m) {
    var b = html('button', 'mbtn');
    b.type = 'button'; b.setAttribute('data-id', m.id); b.setAttribute('aria-pressed', 'false');
    b.appendChild(html('b', '', m.id));
    b.appendChild(html('span', '', m.name));
    b.addEventListener('click', function () { select(m.id); });
    $(m.kind === 'bug' ? 'bug-btns' : 'ref-btns').appendChild(b);
  });
  $('reset').addEventListener('click', function () { select(null); });
  $('reveal-all').addEventListener('click', function () {
    M.forEach(function (m) { shown[m.id] = true; });
    renderMatrix();
  });
  select(null);
})();
