const { parseFrontmatter } = require('./parse-frontmatter')
const { pageKind, stemFromPath } = require('./publish-policy')

/**
 * F08 — extrait locale depuis chemin `cours/fr/...` ou `fr/...`.
 */
const parseLocaleFromPath = rawPath => {
  const cleaned = String(rawPath || '')
    .replace(/\\/g, '/')
    .replace(/^\.?\/+/, '')
    .replace(/\.md$/i, '')
  const withoutCours = cleaned.replace(/^cours\//i, '')
  const m = withoutCours.match(/^(fr|en)\/(.+)$/i)
  if (m) {
    return { locale: m[1].toLowerCase(), path: m[2] }
  }
  return { locale: null, path: withoutCours }
}

const normalizeModuleInput = item => {
  const rawPath = item.path || item.filename || ''
  const { locale: pathLocale, path: pathWithoutLocale } = parseLocaleFromPath(rawPath)

  if (item.body_md !== undefined) {
    const path = (item.path ? parseLocaleFromPath(item.path).path : pathWithoutLocale).replace(/\.md$/, '')
    return {
      path,
      body_md: item.body_md,
      frontmatter: item.frontmatter || {},
      title: item.title || path,
      locale: item.locale || pathLocale || null
    }
  }
  const parsed = parseFrontmatter(item.content || '')
  const path = stemFromPath(pathWithoutLocale || rawPath)
  return {
    path,
    body_md: parsed.body,
    frontmatter: parsed.frontmatter,
    title: item.title || parsed.frontmatter.title || path,
    locale: item.locale || pathLocale || parsed.frontmatter.locale || null
  }
}

module.exports = { normalizeModuleInput, parseLocaleFromPath }
