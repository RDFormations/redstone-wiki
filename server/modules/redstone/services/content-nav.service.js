const { sessionNotFound } = require('../domain/api-result')
const { buildNavBundle } = require('../domain/nav-bundle')

const createContentNavService = ({ sessionRepo, contentRepo, navService }) => ({
  async getNavForSession(sessionId, audience = 'stagiaire') {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()

    const modules = await contentRepo.listBySession(sessionId)
    const navAudience = audience === 'formateur' ? 'formateur' : 'stagiaire'
    const nav = navService.getNav(session, modules, navAudience)

    return {
      ok: true,
      status: 200,
      ...nav
    }
  },

  async getNavBundleForSession(sessionId, audience = 'stagiaire') {
    const result = await this.getNavForSession(sessionId, audience)
    if (!result.ok) return result
    const session = await sessionRepo.findById(sessionId)
    const { ok: _ok, status: _status, ...nav } = result
    return {
      ok: true,
      status: 200,
      bundle: buildNavBundle(session, nav)
    }
  }
})

module.exports = { createContentNavService }
