/**
 * Diff ligne à ligne (LCS simplifié) pour C14 — audit contenu.
 */
const diffLines = (before = '', after = '') => {
  const a = String(before).split('\n')
  const b = String(after).split('\n')
  const n = a.length
  const m = b.length
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const hunks = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      hunks.push({ type: 'same', line: a[i], oldLine: i + 1, newLine: j + 1 })
      i += 1
      j += 1
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
      hunks.push({ type: 'add', line: b[j], newLine: j + 1 })
      j += 1
    } else {
      hunks.push({ type: 'remove', line: a[i], oldLine: i + 1 })
      i += 1
    }
  }
  return hunks
}

const summarizeDiff = hunks => ({
  added: hunks.filter(h => h.type === 'add').length,
  removed: hunks.filter(h => h.type === 'remove').length,
  unchanged: hunks.filter(h => h.type === 'same').length
})

module.exports = { diffLines, summarizeDiff }
