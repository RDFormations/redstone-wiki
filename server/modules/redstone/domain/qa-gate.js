const { pageKind, pairedStem, isRestrictedStem } = require('./publish-policy')
const { checkTriplets } = require('./pair-rules')
const { FORBIDDEN_PLACEHOLDER, MIN_LENGTH } = require('./health-checks')

/**
 * C02 — QA gate structurelle (sans vérification HTTP des liens par défaut)
 */
const computeScore = (issues, tripletsComplete, modulesExpected) => {
  let score = 100
  issues.forEach(issue => {
    score -= issue.severity === 'blocking' ? 8 : 2
  })
  if (modulesExpected && tripletsComplete < modulesExpected) {
    score -= Math.min(30, (modulesExpected - tripletsComplete) * 5)
  }
  return Math.max(0, Math.min(100, score))
}

const runQaGate = (slug, modules, options = {}) => {
  const issues = []
  const moduleFiles = modules.filter(m => pageKind(m.path.replace(/\.md$/, '')) === 'module')
  const modulesFound = moduleFiles.length
  const modulesExpected = options.modulesExpected || modulesFound

  if (!modules.length) {
    issues.push({
      code: 'NO_CONTENT',
      severity: 'blocking',
      message: 'Aucun module importé.',
      file: null
    })
    return buildReport(slug, issues, 0, 0, modulesExpected, modulesFound)
  }

  modules.forEach(mod => {
    const stem = mod.path.replace(/\.md$/, '')
    const kind = pageKind(stem)
    const fm = mod.frontmatter || {}

    if (['module', 'exercice', 'correction'].includes(kind)) {
      const pub = String(fm.published ?? 'false').toLowerCase()
      if (['true', '1', 'yes', 'on'].includes(pub)) {
        issues.push({
          code: 'PUBLISHED_SHOULD_BE_FALSE',
          severity: 'blocking',
          message: 'published doit être false avant mise à disposition brouillon',
          file: stem
        })
      }
    }

    if (kind === 'exercice' || kind === 'correction') {
      const pair = pairedStem(stem, fm)
      if (!pair) {
        issues.push({
          code: 'PAIRING_MISSING',
          severity: 'blocking',
          message: 'Paire exercice/correction invalide',
          file: stem
        })
      } else if (fm.paired && fm.paired !== pair) {
        issues.push({
          code: 'PAIRED_MISMATCH',
          severity: 'blocking',
          message: `paired: attendu ${pair}, trouvé ${fm.paired}`,
          file: stem
        })
      }
    }

    if (FORBIDDEN_PLACEHOLDER.test(mod.body_md || '')) {
      issues.push({
        code: 'FORBIDDEN_PLACEHOLDER',
        severity: 'blocking',
        message: 'Placeholder interdit détecté',
        file: stem
      })
    }

    const minLen = MIN_LENGTH[kind]
    if (minLen && (mod.body_md || '').trim().length < minLen) {
      issues.push({
        code: 'CONTENT_TOO_SHORT',
        severity: 'blocking',
        message: `Contenu trop court (< ${minLen} car.)`,
        file: stem
      })
    }
  })

  const tripletResult = checkTriplets(modules)
  tripletResult.issues.forEach(i => {
    issues.push({
      code: 'TRIPLET_INCOMPLETE',
      severity: 'blocking',
      message: i.message,
      file: i.module
    })
  })

  return buildReport(
    slug,
    issues,
    tripletResult.complete,
    tripletResult.incomplete,
    modulesExpected,
    modulesFound
  )
}

const buildReport = (slug, issues, tripletsComplete, tripletsIncomplete, modulesExpected, modulesFound) => {
  const blocking = issues.filter(i => i.severity === 'blocking')
  const score = computeScore(issues, tripletsComplete, modulesExpected)
  const status = blocking.length ? 'red' : (issues.length ? 'yellow' : 'green')

  return {
    slug,
    status,
    score,
    modules_expected: modulesExpected,
    modules_found: modulesFound,
    triplets_complete: tripletsComplete,
    triplets_incomplete: tripletsIncomplete,
    issues
  }
}

module.exports = { runQaGate, computeScore }
