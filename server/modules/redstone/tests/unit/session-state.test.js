const { SESSION_STATES, INITIAL_STATE, isValidState } = require('../../domain/session-state')

describe('session-state', () => {
  it('état initial est draft', () => {
    expect(INITIAL_STATE).toBe('draft')
  })

  it('liste tous les états F04', () => {
    expect(SESSION_STATES).toEqual([
      'draft',
      'draft_ready',
      'distributed',
      'incomplete',
      'live',
      'archived'
    ])
  })

  it('isValidState accepte les états connus', () => {
    SESSION_STATES.forEach(state => {
      expect(isValidState(state)).toBe(true)
    })
  })

  it('isValidState rejette les valeurs inconnues', () => {
    expect(isValidState('unknown')).toBe(false)
    expect(isValidState('')).toBe(false)
  })
})
