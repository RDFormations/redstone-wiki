const { sessionNotFound, fail, ok } = require('../../domain/api-result')

describe('api-result', () => {
  it('sessionNotFound', () => {
    const result = sessionNotFound()
    expect(result).toEqual({
      ok: false,
      status: 404,
      error: { code: 'session_not_found', message: 'Session introuvable.' }
    })
  })

  it('fail avec extra', () => {
    const result = fail(422, 'health_failed', 'Échec', { checks: [] })
    expect(result.ok).toBe(false)
    expect(result.status).toBe(422)
    expect(result.error.code).toBe('health_failed')
    expect(result.checks).toEqual([])
  })

  it('ok', () => {
    const result = ok(200, { session: { id: 'x' } })
    expect(result.ok).toBe(true)
    expect(result.status).toBe(200)
    expect(result.session.id).toBe('x')
  })
})
