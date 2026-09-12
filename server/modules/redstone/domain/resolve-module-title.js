const { parseFrontmatter } = require('./parse-frontmatter')

const STEM_LIKE_TITLE_RE = /^(module|exercice|correction|annexe)-\d+/i

const titleFromBody = (bodyMd, stem) => {
  const parsed = parseFrontmatter(bodyMd || '')
  const fmTitle = parsed.frontmatter?.title
  if (fmTitle && String(fmTitle).trim()) {
    return String(fmTitle).trim()
  }
  for (const line of (parsed.body || '').split('\n')) {
    const trimmed = line.trim()
    const m = /^#\s+(.+)$/.exec(trimmed)
    if (m) return m[1].trim()
  }
  return stem
}

/** Titre affichage nav — frontmatter/H1 si le titre stocké est un slug fichier. */
const resolveModuleTitle = (mod) => {
  const stem = String(mod.path || '').replace(/\.md$/, '')
  const stored = String(mod.title || '').trim()
  let resolved = stored
  if (stored && stored !== stem && !STEM_LIKE_TITLE_RE.test(stored)) {
    resolved = stored
  } else if (mod.frontmatter?.title) {
    resolved = String(mod.frontmatter.title).trim()
  } else {
    resolved = titleFromBody(mod.body_md, stem) || stored || stem
  }
  if (stem === '00-introduction' && (!resolved || /^00-introduction$/i.test(resolved))) {
    return 'Introduction'
  }
  return resolved
}

module.exports = { resolveModuleTitle, titleFromBody, STEM_LIKE_TITLE_RE }
