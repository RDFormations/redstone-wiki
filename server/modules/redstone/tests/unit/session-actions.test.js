const { canDistribute, DISTRIBUTABLE_STATES } = require('../../domain/session-actions')

describe('session-actions F13', () => {
  it('DISTRIBUTABLE_STATES couvre draft, draft_ready, incomplete', () => {
    expect(DISTRIBUTABLE_STATES).toEqual(['draft', 'draft_ready', 'incomplete'])
  })

  it('canDistribute — oui pour draft_ready sans distributed_at', () => {
    expect(canDistribute({ state: 'draft_ready', distributed_at: null })).toBe(true)
  })

  it('canDistribute — non si déjà distribué', () => {
    expect(canDistribute({ state: 'distributed', distributed_at: '2026-01-01' })).toBe(false)
    expect(canDistribute({ state: 'draft_ready', distributed_at: '2026-01-01' })).toBe(false)
  })

  it('canDistribute — non pour live/archived', () => {
    expect(canDistribute({ state: 'live', distributed_at: null })).toBe(false)
    expect(canDistribute({ state: 'archived', distributed_at: null })).toBe(false)
  })

  it('canDistribute — oui pour incomplete (retry)', () => {
    expect(canDistribute({ state: 'incomplete', distributed_at: null })).toBe(true)
  })
})
