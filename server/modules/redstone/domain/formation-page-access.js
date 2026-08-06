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

/** Retire le contenu sensible du payload page avant rendu SSR (S02). */
const stripPageForFriendlyView = page => {
  if (!page) return page
  page.render = ''
  page.content = ''
  page.toc = typeof page.toc === 'string' ? page.toc : JSON.stringify(page.toc || [])
  return page
}

const resolveFormationPageView = ({ page, pagePath, pageIsPublished, canWrite }) => {
  if (pageIsPublished || canWrite) {
    return { formationUnpublishedFriendly: false, page }
  }
  if (!allowFriendlyUnpublishedView(pagePath)) {
    return { denied: true }
  }
  return {
    formationUnpublishedFriendly: true,
    page: stripPageForFriendlyView({ ...page })
  }
}

module.exports = {
  formationSlugFromPath,
  formationStemFromPath,
  allowFriendlyUnpublishedView,
  stripPageForFriendlyView,
  resolveFormationPageView
}
