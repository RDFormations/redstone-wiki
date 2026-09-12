const {
  createFormationIntroRewrite,
  createFormationGuestRedirect,
  isGuestUser
} = require('../../api/middleware/formation-guest-redirect')

const mockReq = (path, url = path, user = { id: 2 }) => ({
  method: 'GET',
  path,
  url,
  user
})

describe('formation-guest-redirect', () => {
  it('rewrite intro vers la page wiki racine', () => {
    const mw = createFormationIntroRewrite()
    const req = mockReq('/fr/formations/quiris-admin-m365/00-introduction')
    let called = false
    mw(req, {}, () => { called = true })
    expect(called).toBe(true)
    expect(req.url).toBe('/fr/formations/quiris-admin-m365')
  })

  it('rewrite intro conserve la query string', () => {
    const mw = createFormationIntroRewrite()
    const req = mockReq(
      '/fr/formations/quiris-admin-m365/00-introduction',
      '/fr/formations/quiris-admin-m365/00-introduction?x=1'
    )
    mw(req, {}, () => {})
    expect(req.url).toBe('/fr/formations/quiris-admin-m365?x=1')
  })

  it('redirect invité racine formation vers hub stagiaire', async () => {
    const mw = createFormationGuestRedirect(async () => true)
    const req = mockReq('/fr/formations/quiris-admin-m365')
    const res = { redirect: jest.fn() }
    await mw(req, res, () => {})
    expect(res.redirect).toHaveBeenCalledWith(302, '/fr/formations/quiris-admin-m365/stagiaire')
  })

  it('ne redirect pas les utilisateurs connectés', async () => {
    const mw = createFormationGuestRedirect(async () => true)
    const req = mockReq('/fr/formations/quiris-admin-m365', '/fr/formations/quiris-admin-m365', { id: 5 })
    const next = jest.fn()
    await mw(req, {}, next)
    expect(next).toHaveBeenCalled()
  })

  it('isGuestUser', () => {
    expect(isGuestUser({ user: { id: 2 } })).toBe(true)
    expect(isGuestUser({ user: { id: 5 } })).toBe(false)
    expect(isGuestUser({})).toBe(true)
  })
})
