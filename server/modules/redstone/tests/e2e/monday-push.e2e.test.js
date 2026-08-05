const { describeE2e } = require('./helpers/e2e-suite')
const { api, tokens } = require('./helpers/lms-client')
const { provisionDistributedSession } = require('./helpers/session-factory')

describeE2e('LMS — M03 push-monday API', () => {
  let sessionId

  beforeAll(async () => {
    const p = await provisionDistributedSession({ prefix: 'e2e-m03' })
    sessionId = p.sessionId
  }, 120000)

  it('POST push-monday sans token → 401', async () => {
    const res = await api('POST', `/sessions/${sessionId}/push-monday`, {})
    expect(res.status).toBe(401)
  })

  it('POST push-monday avec token agent → 503 ou 200 (selon MONDAY_API_TOKEN)', async () => {
    const res = await api('POST', `/sessions/${sessionId}/push-monday`, { token: tokens().agent })
    expect([200, 502, 503]).toContain(res.status)
    if (res.status === 503) {
      expect(res.body.error.code).toBe('monday_token_missing')
    }
    if (res.status === 200) {
      expect(res.body.ok).toBe(true)
      expect(res.body.patch.portal_status).toBe('Live')
    }
  })

  it('formateur ne peut pas push-monday (403)', async () => {
    const res = await api('POST', `/sessions/${sessionId}/push-monday`, { token: tokens().formateur })
    expect(res.status).toBe(403)
  })
})
