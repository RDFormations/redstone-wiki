/**
 * F06 — parsing des routes natives /formations/{slug}/edit/{module}
 */

const parseFormationEditPath = rawPath => {
  const path = String(rawPath || '').replace(/^\/+/, '').replace(/\/+$/, '')
  const m = path.match(/^formations\/([^/]+)\/edit(?:\/([^/]+))?$/i)
  if (!m) return null
  const slug = m[1].toLowerCase()
  const moduleStem = m[2] ? decodeURIComponent(m[2]).replace(/\.md$/i, '') : null
  return {
    slug,
    moduleStem,
    hubPath: `formations/${slug}/edit`,
    fullPath: moduleStem ? `formations/${slug}/edit/${moduleStem}` : `formations/${slug}/edit`
  }
}

const formationEditUrl = (slug, moduleStem, locale = 'fr') => {
  const stem = String(moduleStem || '').replace(/\.md$/i, '')
  const base = `/${locale}/formations/${slug}/edit`
  return stem ? `${base}/${encodeURIComponent(stem)}` : base
}

module.exports = { parseFormationEditPath, formationEditUrl }
