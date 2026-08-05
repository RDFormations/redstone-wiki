const { pageKind } = require('./publish-policy')

const formationSlugFromPath = path => {
  const parts = String(path || '').split('/').filter(Boolean)
  if (parts[0] !== 'formations' || parts.length < 2) return null
  return parts[1]
}

const formationStemFromPath = path => {
  const parts = String(path || '').split('/').filter(Boolean)
  if (parts[0] !== 'formations' || parts.length < 2) return null
  return parts.length === 2 ? '00-introduction' : parts[2].replace(/\.md$/, '')
}

/** S02 — page friendly pour module/exercice/correction non publié (invité). */
const allowFriendlyUnpublishedView = pagePath => {
  const stem = formationStemFromPath(pagePath)
  if (!stem) return false
  return ['module', 'exercice', 'correction'].includes(pageKind(stem))
}

module.exports = {
  formationSlugFromPath,
  formationStemFromPath,
  allowFriendlyUnpublishedView
}
