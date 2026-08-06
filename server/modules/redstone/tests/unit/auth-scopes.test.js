const {
  SCOPE_READ,
  SCOPE_EDIT,
  SCOPE_PUBLISH,
  SCOPE_IMPORT,
  parseBearer,
  hasScope,
  requireScope
} = require('../../api/middleware/auth-scopes')

describe('auth-scopes (C12 content:edit)', () => {
  it('parseBearer extrait le token', () => {
    expect(parseBearer('Bearer abc-123')).toBe('abc-123')
    expect(parseBearer('bearer xyz')).toBe('xyz')
    expect(parseBearer('Basic x')).toBeNull()
    expect(parseBearer(null)).toBeNull()
  })

  it('hasScope gère wildcard et scope exact', () => {
    expect(hasScope({ scopes: ['*'] }, SCOPE_EDIT)).toBe(true)
    expect(hasScope({ scopes: [SCOPE_READ] }, SCOPE_READ)).toBe(true)
    expect(hasScope({ scopes: [SCOPE_READ] }, SCOPE_EDIT)).toBe(false)
  })

  it('requireScope autorise formateur avec content:edit', () => {
    const next = jest.fn()
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const req = { redstoneAuth: { scopes: [SCOPE_READ, SCOPE_PUBLISH, SCOPE_EDIT] } }
    requireScope(SCOPE_EDIT)(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('requireScope refuse agent sans content:edit', () => {
    const next = jest.fn()
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const req = { redstoneAuth: { scopes: [SCOPE_READ, SCOPE_IMPORT] } }
    requireScope(SCOPE_EDIT)(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'forbidden' })
    }))
  })
})
