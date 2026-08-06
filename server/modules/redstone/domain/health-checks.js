const { pageKind } = require('./publish-policy')
const { checkTriplets } = require('./pair-rules')

const FORBIDDEN_PLACEHOLDER = /\bTODO\b|\[EN\]|\[A completer\]|\[À compléter\]|lorem ipsum/i

const MIN_LENGTH = {
  module: 800,
  exercice: 200,
  correction: 300
}

/**
 * O11 — health checks session
 */
const runHealthChecks = (session, modules, options = {}) => {
  const checks = []
  const stems = modules.map(m => m.path.replace(/\.md$/, ''))

  const hasIntro = stems.includes('00-introduction')
  checks.push({
    checkId: 'intro_present',
    level: hasIntro ? 'ok' : 'error',
    message: hasIntro ? 'Introduction présente.' : 'Introduction (00-introduction) manquante.',
    blocking: !hasIntro
  })

  const tripletResult = checkTriplets(modules)
  checks.push(...tripletResult.issues.map(i => ({
    checkId: i.checkId,
    level: i.level,
    message: i.message,
    blocking: i.blocking
  })))

  modules.forEach(mod => {
    const stem = mod.path.replace(/\.md$/, '')
    const kind = pageKind(stem)
    if (FORBIDDEN_PLACEHOLDER.test(mod.body_md || '')) {
      checks.push({
        checkId: 'forbidden_placeholder',
        level: 'error',
        message: `Placeholder interdit dans ${stem}.`,
        blocking: true
      })
    }
    const minLen = MIN_LENGTH[kind]
    if (minLen && (mod.body_md || '').trim().length < minLen) {
      checks.push({
        checkId: 'content_too_short',
        level: 'error',
        message: `${stem} : contenu trop court (< ${minLen} car.).`,
        blocking: true
      })
    }
    if (['module', 'exercice', 'correction'].includes(kind) && mod.published_stagiaire && options.agentImport) {
      checks.push({
        checkId: 'published_forbidden_agent',
        level: 'error',
        message: `${stem} : publication stagiaire interdite à l'import agent.`,
        blocking: true
      })
    }
  })

  const teams = session.metadata?.links?.teams
  const emargement = session.metadata?.links?.emargement
  checks.push({
    checkId: 'teams_link',
    level: teams ? 'ok' : 'warning',
    message: teams ? 'Lien Teams renseigné.' : 'Lien Teams manquant.',
    blocking: false
  })
  checks.push({
    checkId: 'emargement_link',
    level: emargement ? 'ok' : 'warning',
    message: emargement ? 'Lien émargement renseigné.' : 'Lien émargement manquant.',
    blocking: false
  })

  const { evaluateCourseReady, hoursUntilStart, HOURS_J48 } = require('./session-readiness')
  const hours = hoursUntilStart(session.starts_at)
  if (hours !== null && hours <= HOURS_J48) {
    const readiness = evaluateCourseReady(session, modules)
    checks.push({
      checkId: 'readiness_j48',
      level: readiness.ready ? 'ok' : 'warning',
      message: readiness.ready
        ? 'Cours prêt (critères J-48 h).'
        : `Cours non prêt à J-48 h : ${readiness.issues.join(', ')}`,
      blocking: false,
      details: readiness
    })
  }

  const blocking = checks.filter(c => c.blocking)
  const ok = blocking.length === 0

  return {
    ok,
    checks,
    summary: ok
      ? 'Tous les contrôles bloquants sont passés.'
      : `${blocking.length} contrôle(s) bloquant(s) en échec.`
  }
}

module.exports = { runHealthChecks, FORBIDDEN_PLACEHOLDER, MIN_LENGTH }
