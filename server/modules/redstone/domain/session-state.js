/**
 * F04 — machine à états session (jump tables)
 */

const SESSION_STATES = Object.freeze([
  'draft',
  'draft_ready',
  'distributed',
  'incomplete',
  'live',
  'archived'
])

const INITIAL_STATE = 'draft'

const TRANSITIONS = Object.freeze({
  draft: {
    import_qa_green: 'draft_ready',
    import_qa_red: 'incomplete',
    distribute_ok: 'distributed',
    distribute_fail: 'incomplete'
  },
  draft_ready: {
    distribute_ok: 'distributed',
    distribute_fail: 'incomplete',
    import_qa_red: 'incomplete'
  },
  distributed: {
    distribute_fail: 'incomplete',
    archive: 'archived',
    go_live: 'live'
  },
  incomplete: {
    import_qa_green: 'draft_ready',
    distribute_ok: 'distributed',
    import_qa_red: 'incomplete'
  },
  live: {
    archive: 'archived',
    distribute_fail: 'incomplete'
  },
  archived: {}
})

const AUDIENCE_MESSAGES = Object.freeze({
  draft: {
    stagiaire: 'Cette formation est en cours de préparation.',
    formateur: 'Le contenu est en cours de rédaction.',
    ops: 'Session en brouillon — import contenu requis.',
    agent: 'État draft — importer le contenu via API.'
  },
  draft_ready: {
    stagiaire: 'Le support sera disponible prochainement.',
    formateur: 'Contenu prêt en brouillon — distribuer puis publier jour J.',
    ops: 'QA verte — lancer distribute.',
    agent: 'draft_ready — appeler distribute.'
  },
  distributed: {
    stagiaire: 'Formation disponible.',
    formateur: 'Portail distribué — publier les modules au fil de la session.',
    ops: 'Session distribuée live.',
    agent: 'distributed — hub stagiaire OK.'
  },
  incomplete: {
    stagiaire: 'Le support n\'est pas encore prêt — contactez votre formateur.',
    formateur: 'Des éléments manquent — voir les contrôles dans le cockpit.',
    ops: 'Session incomplète — corriger les checks.',
    agent: 'incomplete — consulter GET /health.'
  },
  live: {
    stagiaire: 'Session en cours.',
    formateur: 'Session en cours.',
    ops: 'Session live.',
    agent: 'live'
  },
  archived: {
    stagiaire: 'Cette session est terminée.',
    formateur: 'Session archivée.',
    ops: 'Session archivée.',
    agent: 'archived'
  }
})

const isValidState = state => SESSION_STATES.includes(state)

const transition = (from, event) => TRANSITIONS[from]?.[event] ?? null

const messageFor = (state, audience = 'ops') =>
  AUDIENCE_MESSAGES[state]?.[audience] || AUDIENCE_MESSAGES.draft.ops

module.exports = {
  SESSION_STATES,
  INITIAL_STATE,
  TRANSITIONS,
  AUDIENCE_MESSAGES,
  isValidState,
  transition,
  messageFor
}
