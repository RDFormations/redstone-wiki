/** Détecte un render Wiki.js obsolète (MD brut au lieu de HTML). */
const isRenderedHtml = render => {
  const value = String(render || '').trim()
  if (!value) return true
  return value.startsWith('<')
}

const isStaleMarkdownRender = row =>
  row &&
  row.editorKey === 'markdown' &&
  row.contentType === 'markdown' &&
  Boolean(row.content) &&
  !isRenderedHtml(row.render)

module.exports = { isRenderedHtml, isStaleMarkdownRender }
