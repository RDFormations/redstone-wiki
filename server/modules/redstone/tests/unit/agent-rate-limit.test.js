const { createAgentRateLimit } = require('../../api/middleware/agent-rate-limit')

const mockRes = () => {
  const headers = {}
  return {
    headers,
    statusCode: 200,
    body: null,
    setHeader (k, v) { headers[k] = v },
    status (code) {
      this.statusCode = code
      return this
    },
    json (body) {
      this.body = body
      return this
    }
  }
}

describe('agent-rate-limit O01', () => {
  it('laisse passer sous le plafond', () => {
    const mw = createAgentRateLimit({ windowMs: 60_000, max: 3 })
    const req = { ip: '1.2.3.4', redstoneAuth: { role: 'agent-bot' } }
    let nextCount = 0
    for (let i = 0; i < 3; i += 1) {
      const res = mockRes()
      mw(req, res, () => { nextCount += 1 })
      expect(res.statusCode).toBe(200)
    }
    expect(nextCount).toBe(3)
  })

  it('répond 429 au-delà du plafond', () => {
    const mw = createAgentRateLimit({ windowMs: 60_000, max: 2 })
    const req = { ip: '9.9.9.9', redstoneAuth: { role: 'agent-bot' } }
    const resOk = mockRes()
    mw(req, resOk, () => {})
    mw(req, mockRes(), () => {})
    const res = mockRes()
    let nexted = false
    mw(req, res, () => { nexted = true })
    expect(nexted).toBe(false)
    expect(res.statusCode).toBe(429)
    expect(res.body.error.code).toBe('rate_limited')
  })
})
