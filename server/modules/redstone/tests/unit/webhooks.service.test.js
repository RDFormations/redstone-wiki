const { createWebhooksService } = require('../../services/webhooks.service')
const { WEBHOOK_EVENTS } = require('../../domain/webhook-events')

const createMockOutbox = () => {
  const store = new Map()
  return {
    async enqueue({ id, event, payload }) {
      const entry = {
        id,
        event,
        payload,
        status: 'pending',
        attempts: 0,
        last_error: null,
        next_retry_at: null,
        delivered_at: null,
        created_at: new Date().toISOString()
      }
      store.set(id, entry)
      return entry
    },
    async findById(id) {
      return store.get(id) || null
    },
    async markDelivered(id) {
      const entry = store.get(id)
      if (!entry) return null
      entry.status = 'delivered'
      entry.delivered_at = new Date().toISOString()
      return entry
    },
    async markRetry(id, { attempts, lastError, nextRetryAt }) {
      const entry = store.get(id)
      if (!entry) return null
      entry.attempts = attempts
      entry.last_error = lastError
      entry.next_retry_at = nextRetryAt
      entry.status = attempts >= 3 ? 'failed' : 'pending'
      return entry
    },
    async listPending() {
      return [...store.values()].filter(e => e.status === 'pending')
    }
  }
}

describe('webhooks.service', () => {
  it('persiste et livre un événement connu', async () => {
    const outboxRepo = createMockOutbox()
    const transport = jest.fn().mockResolvedValue({ status: 202, body: 'ok' })
    const svc = createWebhooksService({
      outboxRepo,
      transport,
      config: { url: 'http://127.0.0.1/hook', secret: 'test' },
      logger: { warn: jest.fn(), error: jest.fn() }
    })

    await svc.emit(WEBHOOK_EVENTS.CONTENT_DRAFT_READY, {
      session_id: 'uuid-1',
      slug: 'test',
      qa_score: 100
    })

    const pending = await outboxRepo.listPending()
    expect(pending).toHaveLength(1)

    const entry = await svc.processEntry(pending[0])
    expect(entry.status).toBe('delivered')
    expect(transport).toHaveBeenCalledTimes(1)
    const [, headers, envelope] = transport.mock.calls[0]
    expect(headers['X-RedStone-Event']).toBe(WEBHOOK_EVENTS.CONTENT_DRAFT_READY)
    expect(envelope.payload.slug).toBe('test')
    expect(headers['X-RedStone-Signature']).toMatch(/^sha256=/)
  })

  it('marque failed après 3 tentatives', async () => {
    const outboxRepo = createMockOutbox()
    const transport = jest.fn().mockRejectedValue(new Error('network'))
    const svc = createWebhooksService({
      outboxRepo,
      transport,
      config: { url: 'http://127.0.0.1/hook' },
      logger: { warn: jest.fn(), error: jest.fn() }
    })

    const entry = await outboxRepo.enqueue({
      id: 'wh-1',
      event: WEBHOOK_EVENTS.SESSION_DISTRIBUTED,
      payload: { session_id: 'x' }
    })

    await svc.processEntry(entry)
    await svc.processEntry(await outboxRepo.findById('wh-1'))
    const final = await svc.processEntry(await outboxRepo.findById('wh-1'))

    expect(final.status).toBe('failed')
    expect(final.attempts).toBe(3)
    expect(transport).toHaveBeenCalledTimes(3)
  })

  it('ignore les événements non enregistrés', async () => {
    const outboxRepo = createMockOutbox()
    const svc = createWebhooksService({
      outboxRepo,
      logger: { warn: jest.fn(), error: jest.fn() }
    })
    const result = await svc.emit('unknown.event', {})
    expect(result).toBeNull()
    expect(await outboxRepo.listPending()).toHaveLength(0)
  })
})
