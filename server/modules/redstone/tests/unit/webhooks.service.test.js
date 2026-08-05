const http = require('http')
const { createWebhooksService, signPayload } = require('../../services/webhooks.service')

describe('webhooks.service', () => {
  let server
  let received

  beforeEach(done => {
    received = []
    server = http.createServer((req, res) => {
      const chunks = []
      req.on('data', c => chunks.push(c))
      req.on('end', () => {
        received.push({
          headers: req.headers,
          body: JSON.parse(Buffer.concat(chunks).toString('utf8'))
        })
        res.statusCode = 202
        res.end('ok')
      })
    })
    server.listen(0, done)
  })

  afterEach(done => {
    server.close(done)
  })

  it('signe le payload HMAC quand secret configuré', () => {
    const body = '{"event":"test"}'
    const sig = signPayload('secret-key', body)
    expect(sig).toHaveLength(64)
  })

  it('deliver envoie l’événement avec retry', async () => {
    const port = server.address().port
    process.env.REDSTONE_LMS_WEBHOOK_URL = `http://127.0.0.1:${port}/hook`
    process.env.REDSTONE_LMS_WEBHOOK_SECRET = 'test-secret'

    const svc = createWebhooksService({ logger: { warn: jest.fn(), error: jest.fn() } })
    const result = await svc.deliver('content.draft_ready', {
      session_id: 'uuid-1',
      slug: 'test',
      qa_score: 100
    })

    expect(result.ok).toBe(true)
    expect(received).toHaveLength(1)
    expect(received[0].body.event).toBe('content.draft_ready')
    expect(received[0].body.payload.slug).toBe('test')
    expect(received[0].headers['x-redstone-signature']).toMatch(/^sha256=/)

    delete process.env.REDSTONE_LMS_WEBHOOK_URL
    delete process.env.REDSTONE_LMS_WEBHOOK_SECRET
  })
})
