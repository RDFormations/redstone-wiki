/** Détecte un render Wiki.js valide (HTML non vide). */
const isRenderedHtml = render => {
  const value = String(render || '').trim()
  if (!value) return false
  return value.startsWith('<')
}

const hasProjectableContent = content => Boolean(String(content || '').trim())

/** Page dont le contenu n'a pas été transformé en HTML valide. */
const isStaleMarkdownRender = row => {
  if (!row || !hasProjectableContent(row.content)) return false
  return !isRenderedHtml(row.render)
}

const buildRenderHealthCheck = (verify = {}) => ({
  checkId: 'render_valid',
  level: verify.ok ? 'ok' : 'error',
  message: verify.ok
    ? 'Tous les rendus HTML de la session sont valides.'
    : `${verify.stale?.length || 0} page(s) sans rendu HTML valide.`,
  blocking: !verify.ok
})

module.exports = { isRenderedHtml, isStaleMarkdownRender, hasProjectableContent, buildRenderHealthCheck }
