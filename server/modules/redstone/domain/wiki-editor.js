/**
 * Alignement projection LMS ↔ éditeurs Wiki.js (server/modules/editor/.../definition.yml).
 * Même règle que server/models/pages.js (createPage / convertPage).
 */
const EDITOR_CONTENT_TYPES = Object.freeze({
  markdown: 'markdown',
  html: 'html',
  asciidoc: 'asciidoc',
  code: 'markdown',
  ckeditor: 'html',
  api: 'markdown'
})

const DEFAULT_EDITOR_KEY = 'markdown'

const resolveContentType = (editorKey = DEFAULT_EDITOR_KEY) =>
  EDITOR_CONTENT_TYPES[editorKey] || EDITOR_CONTENT_TYPES[DEFAULT_EDITOR_KEY]

const resolveFromWikiEditors = (editorKey, editors = []) => {
  const match = editors.find(e => e.key === editorKey)
  return match?.contentType || resolveContentType(editorKey)
}

module.exports = {
  EDITOR_CONTENT_TYPES,
  DEFAULT_EDITOR_KEY,
  resolveContentType,
  resolveFromWikiEditors
}
