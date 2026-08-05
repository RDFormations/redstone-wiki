/** Détecte un render Wiki.js valide (HTML non vide). */
const isRenderedHtml = render => {
  const value = String(render || '').trim()
  if (!value) return false
  return value.startsWith('<')
}

/** Page markdown dont le contenu n'a pas été transformé en HTML (MD brut, vide, ou absent). */
const isStaleMarkdownRender = row =>
  row &&
  row.editorKey === 'markdown' &&
  row.contentType === 'markdown' &&
  Boolean(String(row.content || '').trim()) &&
  !isRenderedHtml(row.render)

module.exports = { isRenderedHtml, isStaleMarkdownRender }
