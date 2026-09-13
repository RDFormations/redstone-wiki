const { wireMondayPushBridge, MONDAY_PUSH_EVENTS } = require('../../services/monday-webhook-bridge')
const { WEBHOOK_EVENTS } = require('../../domain/webhook-events')

describe('monday-webhook-bridge M04', () => {
  it('planifie push Monday sur événements O02 connus', () => {
    const schedulePush = jest.fn()
    const mondayPush = { schedulePush }
    const originalEmit = jest.fn().mockResolvedValue({ id: 'evt-1' })
    const webhooks = { emit: originalEmit }
    wireMondayPushBridge(webhooks, mondayPush)

    webhooks.emit(WEBHOOK_EVENTS.SESSION_DISTRIBUTED, { session_id: 'sess-1', slug: 'test' })

    expect(originalEmit).toHaveBeenCalled()
    expect(schedulePush).toHaveBeenCalledWith('sess-1')
  })

  it('ignore événements hors périmètre M04', () => {
    const schedulePush = jest.fn()
    const webhooks = { emit: jest.fn() }
    wireMondayPushBridge(webhooks, { schedulePush })

    webhooks.emit('unknown.event', { session_id: 'sess-1' })

    expect(schedulePush).not.toHaveBeenCalled()
  })

  it('expose la liste des événements M04', () => {
    expect(MONDAY_PUSH_EVENTS.has(WEBHOOK_EVENTS.MODULE_PUBLISHED)).toBe(true)
    expect(MONDAY_PUSH_EVENTS.has(WEBHOOK_EVENTS.CONTENT_DRAFT_READY)).toBe(true)
  })
})
