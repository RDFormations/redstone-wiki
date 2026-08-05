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

const createNavService = () => ({
  getNav(session, modules, audience = 'stagiaire') {
    const isFormateur = audience === 'formateur'
    const filtered = modules.filter(m => {
      if (isFormateur) return true
      return Boolean(m.published_stagiaire) || pageKind(m.path) === 'intro'
    })

    const items = sortModules(filtered).map(m => {
      const stem = m.path.replace(/\.md$/, '')
      return {
        path: m.path,
        kind: m.kind,
        title: m.title || stem,
        published: m.published_stagiaire,
        href: stem === '00-introduction'
          ? `/formations/${session.slug}`
          : `/formations/${session.slug}/${stem}`
      }
    })

    const total = modules.filter(m => ['module', 'intro'].includes(m.kind)).length
    const publishedCount = modules.filter(m => m.published_stagiaire && m.kind === 'module').length

    return {
      slug: session.slug,
      audience,
      items,
      progress: {
        published_modules: publishedCount,
        total_modules: total,
        label: `${publishedCount}/${total} modules disponibles`
      }
    }
  }
})

module.exports = { createNavService, sortModules }
