const { parseFrontmatter } = require('./parse-frontmatter')
const { pageKind, stemFromPath } = require('./publish-policy')

const normalizeModuleInput = item => {
  if (item.body_md !== undefined) {
    return {
      path: item.path.replace(/\.md$/, ''),
      body_md: item.body_md,
      frontmatter: item.frontmatter || {},
      title: item.title || item.path
    }
  }
  const parsed = parseFrontmatter(item.content || '')
  const path = stemFromPath(item.path || item.filename || '')
  return {
    path,
    body_md: parsed.body,
    frontmatter: parsed.frontmatter,
    title: item.title || parsed.frontmatter.title || path
  }
}

module.exports = { normalizeModuleInput }
