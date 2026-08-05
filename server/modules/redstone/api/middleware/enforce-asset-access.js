/**
 * E01 — bloque les assets formateur / nav brouillon pour les invités.
 */

/* global WIKI */

const FORMATEUR_ASSET_RE = /^\/formateur\//
const NAV_DRAFT_RE = /^\/nav\/(?!.+-published\.json$)[^/]+\.json$/
const NAV_PUBLISHED_RE = /^\/nav\/[^/]+-published\.json$/

const isGuestUser = req => !req.user?.id || req.user.id === 2

const canReadRestrictedAssets = req => {
  if (isGuestUser(req)) return false
  return WIKI.auth.checkAccess(req.user, ['write:pages', 'manage:pages', 'manage:system'], {
    path: 'formations',
    locale: 'fr'
  })
}

const classifyAssetPath = assetPath => {
  if (FORMATEUR_ASSET_RE.test(assetPath)) return 'formateur'
  if (NAV_PUBLISHED_RE.test(assetPath)) return 'nav_published'
  if (NAV_DRAFT_RE.test(assetPath)) return 'nav_draft'
  return 'public'
}

const createAssetAccessMiddleware = () => (req, res, next) => {
  const kind = classifyAssetPath(req.path)
  if (kind === 'public' || kind === 'nav_published') return next()
  if (canReadRestrictedAssets(req)) return next()
  return res.status(403).json({
    error: {
      code: 'asset_forbidden',
      message: 'Accès réservé aux formateurs connectés.'
    }
  })
}

module.exports = {
  createAssetAccessMiddleware,
  classifyAssetPath,
  isGuestUser,
  FORMATEUR_ASSET_RE,
  NAV_DRAFT_RE,
  NAV_PUBLISHED_RE
}
