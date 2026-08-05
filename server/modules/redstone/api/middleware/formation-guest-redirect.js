/**
 * M01 — redirect invité : /formations/{slug} → /formations/{slug}/stagiaire
 * Guests Wiki.js (user id 2) ou utilisateur non connecté uniquement.
 * Ne redirige que si la session LMS existe et est publique (évite fuite / 404 fantôme).
 */
const FORMATION_ROOT_RE = /^\/(?:([a-z]{2})\/)?formations\/([^/]+)\/?$/

const isGuestUser = req => {
  const id = req.user?.id
  return !id || id === 2
}

const createFormationGuestRedirect = (isPublicSession = async () => false) => {
  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (!isGuestUser(req)) return next()

    const match = FORMATION_ROOT_RE.exec(req.path)
    if (!match) return next()

    const locale = match[1] || 'fr'
    const slug = match[2]
    if (slug === 'stagiaire' || slug === 'formateur') return next()

    try {
      const allowed = await isPublicSession(slug)
      if (!allowed) return next()
    } catch {
      return next()
    }

    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    return res.redirect(302, `/${locale}/formations/${slug}/stagiaire${query}`)
  }
}

module.exports = { createFormationGuestRedirect, FORMATION_ROOT_RE, isGuestUser }
