/** F13 — actions OPS disponibles sur une session */

const DISTRIBUTABLE_STATES = Object.freeze(['draft', 'draft_ready', 'incomplete'])

const canDistribute = session =>
  Boolean(session && DISTRIBUTABLE_STATES.includes(session.state) && !session.distributed_at)

module.exports = { DISTRIBUTABLE_STATES, canDistribute }
