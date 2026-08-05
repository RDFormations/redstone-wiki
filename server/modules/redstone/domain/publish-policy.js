/**
 * Port de formation_wiki_policy.py — politique publication RedStone
 */

const RESTRICTED_PREFIX = ['module-', 'exercice-', 'correction-']
const TRIPLET_RE = /^(module|exercice|correction)-(.+)$/

const stemFromPath = path => {
  const base = String(path || '').split('/').pop() || ''
  return base.endsWith('.md') ? base.slice(0, -3) : base
}

const pageKind = stem => {
  if (stem.startsWith('module-')) return 'module'
  if (stem.startsWith('exercice-')) return 'exercice'
  if (stem.startsWith('correction-')) return 'correction'
  if (stem === '00-introduction') return 'intro'
  if (stem === 'stagiaire' || stem === 'formateur') return 'hub'
  if (stem.startsWith('annexe-')) return 'annexe'
  return 'other'
}

const tripletSuffix = stem => {
  const m = TRIPLET_RE.exec(stem)
  return m ? m[2] : null
}

const isRestrictedStem = stem => RESTRICTED_PREFIX.some(p => stem.startsWith(p))

const isTruthy = v => ['true', '1', 'yes', 'on'].includes(String(v).trim().toLowerCase())

/** Agents ne peuvent pas forcer published sur modules restreints (E02) */
const agentMaySetPublished = (stem, frontmatter = {}) => {
  if (isRestrictedStem(stem)) return false
  if (stem === 'formateur') return false
  return !isRestrictedStem(stem)
}

const defaultPublishedStagiaire = (stem, frontmatter = {}) => {
  if ('published' in frontmatter) {
    return isTruthy(frontmatter.published)
  }
  if (stem === '00-introduction' || stem === 'stagiaire') return true
  if (stem === 'formateur') return false
  return !isRestrictedStem(stem)
}

const wikiPagePath = (formationSlug, stem) => {
  if (stem === '00-introduction') {
    return `formations/${formationSlug}`
  }
  return `formations/${formationSlug}/${stem}`
}

const pairedStem = (stem, frontmatter = {}) => {
  if (frontmatter.paired) {
    return String(frontmatter.paired).trim()
  }
  const kind = pageKind(stem)
  const suffix = tripletSuffix(stem)
  if (!suffix) return null
  if (kind === 'exercice') return `correction-${suffix}`
  if (kind === 'correction') return `exercice-${suffix}`
  return null
}

module.exports = {
  RESTRICTED_PREFIX,
  stemFromPath,
  pageKind,
  tripletSuffix,
  isRestrictedStem,
  agentMaySetPublished,
  defaultPublishedStagiaire,
  wikiPagePath,
  pairedStem
}
