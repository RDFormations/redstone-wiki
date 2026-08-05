const { buildStagiaireHub, isPublicHubVisible } = require('../domain/portal-hub')
const { buildFormateurHub } = require('../domain/formateur-hub')
const { buildNavBundle } = require('../domain/nav-bundle')

const createPortalService = ({
  sessionRepo,
  contentRepo,
  navService,
  getSiteHost = () => 'https://formation.redstoneformations.fr',
  logger = console
}) => ({
  async getSessionBySlug(slug) {
    const session = await sessionRepo.findBySlug(slug)
    if (!session) {
      return { ok: false, status: 404, error: { code: 'session_not_found', message: 'Formation introuvable.' } }
    }
    if (!isPublicHubVisible(session.state)) {
      return { ok: false, status: 404, error: { code: 'session_not_public', message: 'Formation introuvable.' } }
    }
    return { ok: true, session }
  },

  async getStagiaireHub(slug) {
    const base = await this.getSessionBySlug(slug)
    if (!base.ok) return base
    const hub = buildStagiaireHub(base.session, { siteHost: getSiteHost() })
    return { ok: true, status: 200, hub }
  },

  async getPublicNav(slug, audience = 'stagiaire') {
    const base = await this.getSessionBySlug(slug)
    if (!base.ok) return base
    const modules = await contentRepo.listBySession(base.session.id)
    const navAudience = audience === 'formateur' ? 'formateur' : 'stagiaire'
    const nav = navService.getNav(base.session, modules, navAudience)
    const bundle = buildNavBundle(base.session, nav)
    return { ok: true, status: 200, nav: bundle }
  },

  async getFormateurHub(slug) {
    const session = await sessionRepo.findBySlug(slug)
    if (!session) {
      return { ok: false, status: 404, error: { code: 'session_not_found', message: 'Formation introuvable.' } }
    }
    const modules = await contentRepo.listBySession(session.id)
    const hub = buildFormateurHub(session, modules, { siteHost: getSiteHost() })
    return { ok: true, status: 200, hub, session }
  }
})

module.exports = { createPortalService }
