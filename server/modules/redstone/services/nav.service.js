const { pageKind } = require('../domain/publish-policy')

const KIND_ORDER = { module: 0, exercice: 1, correction: 2, intro: -1, annexe: 3, hub: -2, other: 4 }

const sortModules = modules =>
  [...modules].sort((a, b) => {
    const stemA = a.path.replace(/\.md$/, '')
    const stemB = b.path.replace(/\.md$/, '')
    if (stemA === '00-introduction') return -1
    if (stemB === '00-introduction') return 1
    const ka = KIND_ORDER[pageKind(stemA)] ?? 9
    const kb = KIND_ORDER[pageKind(stemB)] ?? 9
    if (ka !== kb) return ka - kb
    return stemA.localeCompare(stemB)
  })

/**
 * F08 — sélectionne modules pour une locale avec fallback path-par-path.
 */
const selectModulesForLocale = (modules, locale, fallbackLocale) => {
  if (!locale) return modules
  const byPath = new Map()
  for (const m of modules) {
    const key = m.path
    const cur = byPath.get(key)
    if (!cur) {
      byPath.set(key, m)
      continue
    }
    if (m.locale === locale) byPath.set(key, m)
    else if (cur.locale !== locale && m.locale === fallbackLocale) byPath.set(key, m)
  }
  return [...byPath.values()]
}

const createNavService = () => ({
  getNav(session, modules, audience = 'stagiaire', options = {}) {
    const isFormateur = audience === 'formateur'
    const locale = options.locale || session.locale_default || 'fr'
    const fallback = session.locale_default || 'fr'
    const localized = selectModulesForLocale(modules, locale, fallback)

    const filtered = localized.filter(m => {
      if (isFormateur) return true
      return Boolean(m.published_stagiaire) || pageKind(m.path) === 'intro'
    })

    const items = sortModules(filtered).map(m => {
      const stem = m.path.replace(/\.md$/, '')
      const prefix = `/${locale}`
      return {
        path: m.path,
        kind: m.kind,
        title: m.title || stem,
        published: m.published_stagiaire,
        locale: m.locale || locale,
        href: stem === '00-introduction'
          ? `${prefix}/formations/${session.slug}`
          : `${prefix}/formations/${session.slug}/${stem}`
      }
    })

    const total = localized.filter(m => ['module', 'intro'].includes(m.kind)).length
    const publishedCount = localized.filter(m => m.published_stagiaire && m.kind === 'module').length

    return {
      slug: session.slug,
      audience,
      locale,
      items,
      progress: {
        published_modules: publishedCount,
        total_modules: total,
        label: `${publishedCount}/${total} modules disponibles`
      }
    }
  }
})

module.exports = { createNavService, sortModules, selectModulesForLocale }
