const { contentReady, distributed, supportReady, enrichSessionStatus } = require('../../domain/session-status')

describe('session-status O03', () => {
  it('content_ready sans distributed', () => {
    const session = { state: 'draft_ready', content_ready_at: '2026-01-01', distributed_at: null }
    expect(contentReady(session)).toBe(true)
    expect(distributed(session)).toBe(false)
    expect(supportReady(session)).toBe(false)
  })

  it('support_ready uniquement après distribute', () => {
    const session = {
      state: 'distributed',
      content_ready_at: '2026-01-01',
      distributed_at: '2026-01-02'
    }
    expect(supportReady(session)).toBe(true)
    const enriched = enrichSessionStatus(session)
    expect(enriched.content_ready).toBe(true)
    expect(enriched.distributed).toBe(true)
    expect(enriched.support_ready).toBe(true)
  })

  it('draft_ready seul ne donne pas support_ready', () => {
    const session = { state: 'draft_ready', content_ready_at: 'x', distributed_at: null }
    expect(supportReady(session)).toBe(false)
  })
})
