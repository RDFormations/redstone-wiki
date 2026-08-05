const BODY_MODULE = 'Contenu module E2E RedStone LMS. '.repeat(55)
const BODY_EXERCICE = 'Énoncé exercice E2E. '.repeat(18)
const BODY_CORRECTION = 'Correction exercice E2E détaillée. '.repeat(18)

/** Corpus minimal QA verte + health checks distribute (F03, C02, O11). */
const minimalCourseModules = () => [
  {
    path: '00-introduction.md',
    content: `---
title: Introduction E2E
published: true
---
# Introduction E2E

Formation de test automatisé RedStone LMS.
`
  },
  {
    path: 'module-01-e2e.md',
    content: `---
title: Module 1 E2E
published: false
---
# Module 1

${BODY_MODULE}
`
  },
  {
    path: 'exercice-01-e2e.md',
    content: `---
title: Exercice 1 E2E
paired: correction-01-e2e
published: false
---
# Exercice

${BODY_EXERCICE}
`
  },
  {
    path: 'correction-01-e2e.md',
    content: `---
title: Correction 1 E2E
paired: exercice-01-e2e
published: false
---
# Correction

${BODY_CORRECTION}
`
  }
]

const uniqueSlug = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

/** ID Monday unique par run (évite 409 monday_item_id_exists entre exécutions). */
const uniqueMondayId = () =>
  Math.floor(Date.now() % 2_000_000_000) + Math.floor(Math.random() * 10_000)

module.exports = {
  minimalCourseModules,
  uniqueSlug,
  uniqueMondayId
}
