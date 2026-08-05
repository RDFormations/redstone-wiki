/**
 * Contenu Markdown minimal pour les pages hub LMS (formateur / stagiaire).
 * Doit produire du HTML non vide via le pipeline Wiki.js — jamais de commentaires HTML seuls.
 */
const LMS_OWNED_HUB_STEMS = new Set(['formateur', 'stagiaire'])

const isLmsOwnedHubStem = stem => LMS_OWNED_HUB_STEMS.has(String(stem || '').replace(/\.md$/, ''))

const hubBodyMarkdown = (kind, session = {}) => {
  const title = session.title || session.slug || 'formation'
  if (kind === 'formateur') {
    return [
      '# Espace formateur',
      '',
      `Portail formateur RedStone pour **${title}**.`,
      "L'interface interactive charge automatiquement planning, publication et labs.",
      ''
    ].join('\n')
  }
  return [
    '# Liens session',
    '',
    `Portail stagiaire RedStone pour **${title}**.`,
    'Émargement, support de cours et ressources de la session.',
    ''
  ].join('\n')
}

module.exports = { LMS_OWNED_HUB_STEMS, isLmsOwnedHubStem, hubBodyMarkdown }
