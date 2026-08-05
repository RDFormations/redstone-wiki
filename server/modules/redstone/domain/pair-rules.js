const { tripletSuffix } = require('./publish-policy')

/**
 * R2 — paires exercice/correction atomiques
 */
const buildTripletMap = modules => {
  const stems = new Set(modules.map(m => m.path.replace(/\.md$/, '')))
  const suffixes = new Set()
  stems.forEach(stem => {
    const suffix = tripletSuffix(stem)
    if (suffix) suffixes.add(suffix)
  })
  return { stems, suffixes }
}

const checkTriplets = modules => {
  const { stems, suffixes } = buildTripletMap(modules)
  const issues = []
  let complete = 0
  let incomplete = 0

  suffixes.forEach(suffix => {
    const needed = new Set([`module-${suffix}`, `exercice-${suffix}`, `correction-${suffix}`])
    const present = [...needed].filter(s => stems.has(s))
    if (present.length === needed.size) {
      complete += 1
    } else {
      incomplete += 1
      const missing = [...needed].filter(s => !stems.has(s))
      issues.push({
        checkId: 'triplet_incomplete',
        level: 'error',
        message: `Triplet incomplet — manque : ${missing.join(', ')}`,
        blocking: true,
        module: suffix
      })
    }
  })

  return { complete, incomplete, issues }
}

const publishPairPaths = (exercicePath, modules) => {
  const stem = exercicePath.replace(/\.md$/, '')
  const suffix = tripletSuffix(stem)
  if (!suffix) return [exercicePath]
  const correction = `correction-${suffix}`
  const hasCorrection = modules.some(m => m.path === correction || m.path === `${correction}.md`)
  return hasCorrection ? [exercicePath, correction] : [exercicePath]
}

module.exports = {
  buildTripletMap,
  checkTriplets,
  publishPairPaths
}
