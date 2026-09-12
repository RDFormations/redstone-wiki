/**
 * M01 — redirect invité : /formations/{slug} → /formations/{slug}/stagiaire
 * Guests Wiki.js (user id 2) ou utilisateur non connecté uniquement.
 * Ne redirige que si la session LMS existe et est publique (évite fuite / 404 fantôme).
 *
 * /formations/{slug}/00-introduction → rewrite interne vers la page wiki racine
 * (contenu intro) sans déclencher la redirection hub stagiaire.
 */
const FORMATION_ROOT_RE = /^\/(?:([a-z]{2})\/)?formations\/([^/]+)\/?$/
const FORMATION_INTRO_RE = /^\/(?:([a-z]{2})\/)?formations\/([^/]+)\/00-introduction\/?$/

const isGuestUser = req => {
  const id = req.user?.id
  return !id || id === 2
}

const createFormationIntroRewrite = () => (req, res, next) => {
  const match = FORMATION_INTRO_RE.exec(req.path)
  if (!match) return next()

  const locale = match[1] || 'fr'
  const slug = match[2]
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  req.url = `/${locale}/formations/${slug}${query}`
  return next()
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

const createFormationPortalMiddleware = (isPublicSession = async () => false) => {
  const introRewrite = createFormationIntroRewrite()
  const guestRedirect = createFormationGuestRedirect(isPublicSession)
  return (req, res, next) => {
    introRewrite(req, res, err => {
      if (err) return next(err)
      guestRedirect(req, res, next)
    })
  }
}

module.exports = {
  createFormationGuestRedirect,
  createFormationIntroRewrite,
  createFormationPortalMiddleware,
  FORMATION_ROOT_RE,
  FORMATION_INTRO_RE,
  isGuestUser
}
