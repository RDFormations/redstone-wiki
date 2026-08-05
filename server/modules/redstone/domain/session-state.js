/**
 * F04 — Machine à états session (jump table)
 * F01 : état initial `draft` uniquement ; transitions complètes en F04.
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

const isValidState = state => SESSION_STATES.includes(state)

module.exports = {
  SESSION_STATES,
  INITIAL_STATE,
  isValidState
}
