// Line-based LCS diff, unified style: ' ' context, '-' removed, '+' added.
// At most `context` unchanged lines are kept around changes; longer unchanged runs collapse to '…'.
export function unifiedDiff(a, b, context = 2) {
  const x = String(a).split('\n');
  const y = String(b).split('\n');
  const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const ops = []; // [marker, text]
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) {
      ops.push([' ', x[i]]);
      i++;
      j++;
    } else if (j >= y.length || (i < x.length && dp[i + 1][j] >= dp[i][j + 1])) ops.push(['-', x[i++]]);
    else ops.push(['+', y[j++]]);
  }
  if (ops.every(([m]) => m === ' ')) return '';
  const near = ops.map((_, k) => {
    for (let d = -context; d <= context; d++) if (ops[k + d] && ops[k + d][0] !== ' ') return true;
    return false;
  });
  const out = [];
  ops.forEach(([m, t], k) => {
    if (near[k]) out.push(m + t);
    else if (k === 0 || near[k - 1]) out.push('…');
  });
  return out.join('\n');
}
