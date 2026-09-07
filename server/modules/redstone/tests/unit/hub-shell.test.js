const { hubBodyMarkdown, isLmsOwnedHubStem } = require('../../domain/hub-shell')

describe('hub-shell domain', () => {
  const session = { slug: 'quiris-admin-m365', title: 'Administration Microsoft 365' }

  it('isLmsOwnedHubStem identifie formateur, stagiaire et edit', () => {
    expect(isLmsOwnedHubStem('formateur')).toBe(true)
    expect(isLmsOwnedHubStem('stagiaire')).toBe(true)
    expect(isLmsOwnedHubStem('edit')).toBe(true)
    expect(isLmsOwnedHubStem('formateur.md')).toBe(true)
    expect(isLmsOwnedHubStem('module-01-a')).toBe(false)
  })

  it('hubBodyMarkdown produit du markdown rendable (pas de commentaire HTML seul)', () => {
    const formateur = hubBodyMarkdown('formateur', session)
    const stagiaire = hubBodyMarkdown('stagiaire', session)

    expect(formateur).toMatch(/^# Espace formateur/)
    expect(stagiaire).toMatch(/^# Liens session/)
    expect(formateur).not.toMatch(/^<!--/)
    expect(stagiaire).not.toMatch(/^<!--/)
    expect(formateur).toContain(session.title)
    expect(stagiaire).toContain(session.title)
  })
})
