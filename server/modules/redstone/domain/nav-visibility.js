/**
 * Visibilité sidebar formation (stagiaire vs formateur).
 * Aligné sur formation-nav-sidebar.vue — modules non publiés absents pour stagiaire.
 */

const isNavItemVisible = (item, { canSeeUnpublished = false } = {}) =>
  Boolean(item) && (item.isPublished !== false || canSeeUnpublished)

const blockHasVisiblePractice = (block, opts) => {
  const pr = block && block.practice
  if (!pr) return false
  return isNavItemVisible(pr.exercice, opts) || isNavItemVisible(pr.correction, opts)
}

const isModuleBlockVisible = (block, opts = {}) => {
  if (!block) return false
  if (isNavItemVisible(block.module, opts)) return true
  return blockHasVisiblePractice(block, opts)
}

/** Filtre les items d'une liste nav pour audience stagiaire (pas de placeholder). */
const filterNavItemsForAudience = (items, { canSeeUnpublished = false } = {}) =>
  (items || []).filter(it => isNavItemVisible(it, { canSeeUnpublished }))

module.exports = {
  isNavItemVisible,
  blockHasVisiblePractice,
  isModuleBlockVisible,
  filterNavItemsForAudience
}
