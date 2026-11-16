// Generates test/fixtures/report.sample.json (a realistic sample, not real run data).
import { writeFileSync } from 'node:fs';
const mutants = [
  { id: 'B1', kind: 'bug', description: 'Cart total ignores quantity' },
  { id: 'B2', kind: 'bug', description: 'Login accepts an empty password' },
  { id: 'B3', kind: 'bug', description: 'Search returns no results for exact matches' },
  { id: 'B4', kind: 'bug', description: 'Checkout button stays disabled with a valid cart' },
  { id: 'B5', kind: 'bug', description: 'Coupon discount applied twice' },
  { id: 'R1', kind: 'refactor', description: 'Test ids renamed and class names changed, behaviour identical' },
  { id: 'R2', kind: 'refactor', description: 'Layout wrapped in extra containers, behaviour identical' },
];
const ids = mutants.map((m) => m.id);
const P = (p) => ({ passed: p }), K = (s, x = {}) => ({ status: s, ...x });
// spec: per test, [pwFailsOn[], kaneFailsOn[], heal ids]
const spec = [
  ['Add item to cart', ['B1'], ['B1'], [], ['R1']],
  ['Log in with valid credentials', ['B2'], ['B2'], [], []],
  ['Search finds a product', ['B3'], ['B3'], [], []],
  ['Checkout with a valid cart', ['B4'], ['B4'], [], ['R1']],
  ['Apply a coupon code', ['B5'], ['B5'], ['R1'], ['R1']],
  ['Remove item from cart', ['B1'], [], [], []],
];
const tests = spec.map(([title, pwFail, kFail, heal, pwFailRef], i) => {
  const pw = { clean: P(true) }, kane = { clean: K('passed') }, cells = { clean: 'ok' };
  for (const m of mutants) {
    const pwf = pwFail.includes(m.id) || pwFailRef.includes(m.id);
    pw[m.id] = P(!pwf);
    const kf = kFail.includes(m.id);
    kane[m.id] = K(kf ? 'failed' : 'passed', heal.includes(m.id) ? { healTriggered: true } : {});
    cells[m.id] = m.kind === 'bug' ? (pwf && kf ? 'parity-caught' : !pwf && !kf ? 'parity-missed' : pwf ? 'kane-weaker' : 'kane-stronger') : (!kf ? (pwf ? 'false-alarm-avoided' : 'parity') : 'kane-false-alarm');
  }
  return { id: `t${i + 1}`, title, status: 'ported', reason: null, cells, pw, kane, loop: [], pwLines: 14 + i * 3, mdLines: 7 + i, credits: 2.5 + i * 0.4, mdPath: `workers-out/tests/${title.toLowerCase().replace(/[^a-z]+/g, '-')}/${title.toLowerCase().replace(/[^a-z]+/g, '-')}_test.md` };
});
// Test 6 was weaker on B1 and was repaired in one round.
const t6 = tests[5];
t6.status = 'repaired';
t6.loop = [{ round: 1, weakOn: ['B1'], change: '  Open the cart page\n  Click "Remove" on the first item\n- Verify the cart is updated\n+ Verify the cart item count drops from 2 to 1\n+ Verify the cart total equals the price of the remaining item', after: { clean: 'ok', B1: 'parity-caught', B2: 'parity-missed', R1: 'parity', R2: 'parity' } }];
// The repaired state: Kane now catches B1.
t6.kane.B1 = K('failed'); t6.cells.B1 = 'parity-caught';
// To show a kane-weaker cell still standing, test 3 is weak on B5 (needs a human is not set; status stays ported for the sample).
tests[2].kane.B5 = K('passed'); tests[2].pw.B5 = P(false); tests[2].cells.B5 = 'kane-weaker';
tests[2].status = 'needs-human'; tests[2].reason = 'still not at parity after 2 repair round(s): B5';
tests[2].loop = [
  { round: 1, weakOn: ['B5'], change: '- Verify the price is shown\n+ Verify the price shown after the coupon is 10% lower', after: { clean: 'ok', B5: 'kane-weaker' } },
  { round: 2, weakOn: ['B5'], change: '+ Verify the discount line appears exactly once', after: { clean: 'ok', B5: 'kane-weaker' } },
];
writeFileSync(new URL('../test/fixtures/report.sample.json', import.meta.url), JSON.stringify({ generatedAt: '2026-11-16T09:30:00Z', dryRun: false, mutants, tests }, null, 2));
