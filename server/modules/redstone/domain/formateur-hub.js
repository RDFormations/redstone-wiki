const { pageKind } = require('./publish-policy')
const { isoDate, siteBase } = require('./portal-hub')
const { qrSvgForUrl } = require('./qr-svg')

const MONDAY_BOARD_ID = process.env.MONDAY_MISSIONS_BOARD_ID || '18420737449'

const moduleNum = stem => {
  const m = /^(?:module|exercice|correction)-(\d+)/.exec(stem)
  return m ? Number.parseInt(m[1], 10) : 99
}

const stemFromPath = path => String(path || '').replace(/\.md$/, '')

const tripletStems = moduleStem => {
  const suffix = moduleStem.replace(/^module-/, '')
  return [`module-${suffix}`, `exercice-${suffix}`, `correction-${suffix}`]
}

const moduleIndex = modules =>
  Object.fromEntries(modules.map(m => [stemFromPath(m.path), m]))

const isModulePublished = (moduleStem, modules) => {
  const byPath = moduleIndex(modules)
  const stems = tripletStems(moduleStem)
  const moduleMod = byPath[stems[0]]
  if (!moduleMod?.published_stagiaire) return false
  return stems.slice(1).every(stem => {
    const mod = byPath[stem]
    if (!mod) return true
    return Boolean(mod.published_stagiaire)
  })
}

const buildModuleRow = (stem, modules, session) => {
  const mod = moduleIndex(modules)[stem]
  const slug = session.slug
  return {
    stem,
    title: mod?.title || stem.replace(/-/g, ' '),
    href: stem === '00-introduction' ? `/formations/${slug}` : `/formations/${slug}/${stem}`,
    path: `formations/${slug}/${stem}`,
    isPublished: isModulePublished(stem, modules),
    moduleNum: moduleNum(stem)
  }
}

const formatDayLabel = (day, index) => {
  if (day.label) return day.label
  const prefix = `Jour ${day.day || index + 1}`
  if (!day.date) return prefix
  try {
    const d = new Date(`${day.date}T12:00:00`)
    const formatted = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    return `${prefix} — ${formatted}`
  } catch {
    return `${prefix} — ${day.date}`
  }
}

const buildSchedule = (session, modules) => {
  const planning = session.metadata?.planning || []
  const moduleStems = modules
    .filter(m => pageKind(stemFromPath(m.path)) === 'module')
    .map(m => stemFromPath(m.path))

  if (planning.length) {
    return planning.map((day, index) => ({
      day: day.day || index + 1,
      label: formatDayLabel(day, index),
      modules: (day.modules || [])
        .filter(stem => moduleStems.includes(stem))
        .map(stem => buildModuleRow(stem, modules, session))
    }))
  }

  return [
    {
      day: 1,
      label: 'Planning',
      modules: moduleStems.map(stem => buildModuleRow(stem, modules, session))
    }
  ]
}

const publicationSummary = modules => {
  const restricted = modules.filter(m => ['module', 'exercice', 'correction'].includes(m.kind))
  const published = restricted.filter(m => m.published_stagiaire)
  return {
    total: modules.filter(m => m.kind === 'module').length,
    published: modules.filter(m => m.kind === 'module' && m.published_stagiaire).length,
    draft: modules.filter(m => m.kind === 'module' && !m.published_stagiaire).length,
    restricted_total: restricted.length,
    restricted_published: published.length
  }
}

const mondayItemUrl = itemId =>
  itemId ? `https://rdformations.monday.com/boards/${MONDAY_BOARD_ID}/pulses/${itemId}` : ''

const defaultFormateurLinks = (session, host) => {
  const slug = session.slug
  const locale = session.locale_default || 'fr'
  const meta = session.metadata || {}
  const links = meta.links || {}
  return [
    {
      id: 'portail-stagiaires',
      label: 'Portail stagiaires',
      url: `${host}/formations/${slug}`,
      icon: 'mdi-school',
      external: true
    },
    {
      id: 'hub-stagiaire',
      label: 'Page liens stagiaires',
      url: `${host}/${locale}/formations/${slug}/stagiaire`,
      icon: 'mdi-account-group',
      external: true
    },
    {
      id: 'emargement',
      label: 'Émargement',
      url: links.emargement || '',
      icon: 'mdi-clipboard-check-outline',
      hint: links.emargement ? '' : 'Lien à renseigner (Monday / OPS)'
    },
    {
      id: 'teams',
      label: 'Classe Teams',
      url: links.teams || '',
      icon: 'mdi-microsoft-teams',
      hint: links.teams ? '' : 'Lien à renseigner'
    }
  ]
}

/**
 * T01 — cockpit formateur depuis session LMS + modules DB (remplace static JSON).
 */
const buildFormateurHub = (session, modules, options = {}) => {
  const host = siteBase(options.siteHost)
  const locale = session.locale_default || 'fr'
  const slug = session.slug
  const meta = session.metadata || {}
  const stagiaireUrl = `${host}/${locale}/formations/${slug}/stagiaire`
  const schedule = buildSchedule(session, modules)
  const publication = publicationSummary(modules)
  const moduleRows = modules
    .filter(m => m.kind === 'module')
    .map(m => buildModuleRow(stemFromPath(m.path), modules, session))

  return {
    sessionId: session.id,
    slug,
    lang: locale,
    base_slug: slug,
    title: session.title,
    client: session.client,
    state: session.state,
    content_ready: Boolean(session.content_ready_at),
    distributed: Boolean(session.distributed_at),
    portalUrl: `${host}/formations/${slug}`,
    stagiaireUrl,
    stagiaireQrSvg: qrSvgForUrl(stagiaireUrl),
    formateurHref: `/formations/${slug}/formateur`,
    durationDays: meta.duration_days || meta.durationDays || null,
    reference: session.ref_client || '',
    location: meta.location || '',
    modality: meta.modality || meta.monday?.modalite || '',
    dates: {
      start: isoDate(session.starts_at),
      end: isoDate(session.ends_at)
    },
    participants: meta.participants || null,
    trainer: meta.formateur || meta.monday?.formateur || 'RedStone Formations',
    schedule,
    links: meta.formateur_links || defaultFormateurLinks(session, host),
    contacts: meta.contacts || [],
    checklist: meta.checklist || [],
    notes: (meta.notes || meta.monday?.notes || '').trim(),
    monday: {
      item_id: session.monday_item_id,
      url: mondayItemUrl(session.monday_item_id),
      etat: meta.monday?.etat || ''
    },
    labs: meta.labs || [],
    publication,
    modules: moduleRows
  }
}

module.exports = {
  buildFormateurHub,
  buildSchedule,
  isModulePublished,
  publicationSummary,
  moduleNum,
  tripletStems
}
