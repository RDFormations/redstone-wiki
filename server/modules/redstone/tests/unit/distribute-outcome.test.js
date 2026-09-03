const { buildIncompleteOutcome } = require('../../domain/distribute-outcome')
const { WEBHOOK_EVENTS } = require('../../domain/webhook-events')

describe('distribute-outcome O03', () => {
  it('passe la session en incomplete + webhook SESSION_INCOMPLETE', async () => {
    const updated = { id: 's1', state: 'incomplete' }
    const sessionRepo = {
      update: jest.fn().mockResolvedValue(updated)
    }
    const webhooks = { emit: jest.fn() }
    const result = await buildIncompleteOutcome({
      sessionRepo,
      sessionId: 's1',
      session: { slug: 'demo' },
      webhooks,
      errors: [{ checkId: 'X', message: 'boom' }],
      projection: { pages: 0 },
      errorCode: 'health_failed',
      errorMessage: 'Health rouge'
    })
    expect(sessionRepo.update).toHaveBeenCalledWith('s1', { state: 'incomplete' })
    expect(webhooks.emit).toHaveBeenCalledWith(
      WEBHOOK_EVENTS.SESSION_INCOMPLETE,
      expect.objectContaining({ session_id: 's1', slug: 'demo' })
    )
    expect(result.ok).toBe(false)
    expect(result.status).toBe(422)
    expect(result.state).toBe('incomplete')
  })
})
