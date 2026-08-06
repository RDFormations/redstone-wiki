const moment = require('moment')
const { resolveFormationPageView } = require('../../domain/formation-page-access')

const isPagePublished = page => {
  let published = Boolean(page?.isPublished)
  if (published && page.publishStartDate) {
    published = moment(page.publishStartDate).isSameOrBefore()
  }
  if (published && page.publishEndDate) {
    published = moment(page.publishEndDate).isSameOrAfter()
  }
  return published
}

/**
 * S02 — applique la vue friendly invité (sans fuite SSR) sur une page formation.
 * Retourne denied | { page, formationUnpublishedFriendly }.
 */
const applyFormationPageView = ({ page, pagePath, canWrite }) => {
  const pageIsPublished = isPagePublished(page)
  if (pageIsPublished || canWrite) {
    return { page, formationUnpublishedFriendly: false }
  }
  const formationView = resolveFormationPageView({
    page,
    pagePath,
    pageIsPublished,
    canWrite
  })
  if (formationView.denied) return { denied: true }
  return {
    page: formationView.page,
    formationUnpublishedFriendly: Boolean(formationView.formationUnpublishedFriendly)
  }
}

module.exports = {
  isPagePublished,
  applyFormationPageView
}
