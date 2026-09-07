const { buildStagiaireHub, isPublicHubVisible } = require('../domain/portal-hub')
const { buildFormateurHub } = require('../domain/formateur-hub')
const { buildNavBundle } = require('../domain/nav-bundle')

const createPortalService = ({
  sessionRepo,
  contentRepo,
  navService,
  labsService = null,
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

    // C05 — labs publiés (API) en plus de meta.labs
    if (labsService?.list) {
      const listed = await labsService.list(base.session.id, { stagiaireOnly: true })
      if (listed.ok && listed.labs?.length) {
        const host = String(getSiteHost()).replace(/\/$/, '')
        hub.labs = listed.labs.map(lab => ({
          id: lab.id,
          label: lab.label || lab.filename,
          filename: lab.filename,
          url: `${host}/api/v1/public/sessions/by-slug/${encodeURIComponent(slug)}/labs/${lab.id}/download`,
          size_bytes: lab.size_bytes
        }))
      }
    }

    return { ok: true, status: 200, hub }
  },

  async getPublicNav(slug, audience = 'stagiaire', locale = null) {
    const base = await this.getSessionBySlug(slug)
    if (!base.ok) return base
    const modules = await contentRepo.listBySession(base.session.id)
    const navAudience = audience === 'formateur' ? 'formateur' : 'stagiaire'
    const lang = locale || base.session.locale_default || 'fr'
    const nav = navService.getNav(base.session, modules, navAudience, { locale: lang })
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
  },

  async downloadPublicLab(slug, labId) {
    const base = await this.getSessionBySlug(slug)
    if (!base.ok) return base
    if (!labsService?.download) {
      return { ok: false, status: 503, error: { code: 'labs_unavailable', message: 'Labs indisponibles.' } }
    }
    return labsService.download(base.session.id, labId, { requirePublished: true })
  }
})

module.exports = { createPortalService }
