/**
 * C13 — proposition de patch MD (human-in-the-loop).
 * Provider heuristique déterministe (tests / sans clé LLM) + hook HTTP optionnel.
 */

const crypto = require('crypto')

const REDSTONE_RULES = [
  'Ne publie jamais côté stagiaire — brouillon uniquement.',
  'Conserve le frontmatter YAML existant si présent.',
  'Préfère Markdown Wiki.js (Mermaid, callouts Obsidian).',
  'Exercice + correction restent une paire atomique.'
]

const extractFencedMarkdown = message => {
  const match = String(message || '').match(/```(?:md|markdown)?\s*\n([\s\S]*?)```/i)
  return match ? match[1].replace(/\s+$/, '') : null
}

const titleFromInstruction = message => {
  const m = String(message || '').match(
    /ajoute(?:r)?\s+(?:une\s+)?section\s+([^\n.!?]+)/i
  )
  if (!m) return null
  return m[1].trim().replace(/^["«]|["»]$/g, '')
}

/**
 * Applique une consigne déterministe au MD courant.
 * @returns {{ proposed_body_md: string, provider: string, summary: string }}
 */
const proposeHeuristic = ({ body_md = '', message = '' }) => {
  const base = String(body_md)
  const msg = String(message || '').trim()
  if (!msg) {
    return {
      proposed_body_md: base,
      provider: 'heuristic',
      summary: 'Consigne vide — aucune modification.'
    }
  }

  const fenced = extractFencedMarkdown(msg)
  if (fenced !== null) {
    return {
      proposed_body_md: fenced,
      provider: 'heuristic',
      summary: 'Remplacement par le Markdown fourni dans le message.'
    }
  }

  const sectionTitle = titleFromInstruction(msg)
  if (sectionTitle) {
    const heading = `## ${sectionTitle}`
    if (base.includes(heading)) {
      return {
        proposed_body_md: base,
        provider: 'heuristic',
        summary: `Section « ${sectionTitle} » déjà présente.`
      }
    }
    const block = [
      '',
      heading,
      '',
      `Contenu proposé suite à la consigne : ${msg}`,
      ''
    ].join('\n')
    return {
      proposed_body_md: `${base.replace(/\s+$/, '')}\n${block}`,
      provider: 'heuristic',
      summary: `Ajout de la section « ${sectionTitle} ».`
    }
  }

  const note = [
    '',
    '## Note assistant',
    '',
    `> Consigne : ${msg}`,
    '',
    '_Proposition générée — cliquez Appliquer pour valider (human-in-the-loop)._',
    ''
  ].join('\n')
  return {
    proposed_body_md: `${base.replace(/\s+$/, '')}\n${note}`,
    provider: 'heuristic',
    summary: 'Ajout d’une note assistant (mode heuristique).'
  }
}

/**
 * Appel HTTP optionnel vers un agent LLM (REDSTONE_CHATBOT_URL).
 * Corps attendu : { proposed_body_md, summary? }
 */
const proposeViaHttp = async ({ body_md, message, context }, fetchImpl) => {
  const url = process.env.REDSTONE_CHATBOT_URL || process.env.LMS_CHATBOT_URL
  if (!url) return null
  const fetchFn = fetchImpl || globalThis.fetch
  if (typeof fetchFn !== 'function') return null

  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.REDSTONE_CHATBOT_TOKEN
        ? { Authorization: `Bearer ${process.env.REDSTONE_CHATBOT_TOKEN}` }
        : {})
    },
    body: JSON.stringify({
      message,
      body_md,
      context,
      rules: REDSTONE_RULES
    })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Chatbot HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  const json = await res.json()
  if (!json || json.proposed_body_md == null) {
    throw new Error('Réponse chatbot invalide (proposed_body_md manquant).')
  }
  return {
    proposed_body_md: String(json.proposed_body_md),
    provider: 'http',
    summary: json.summary || 'Proposition agent distant.'
  }
}

const buildChatMessageId = () => `chat_${crypto.randomUUID()}`

const buildProposalId = () => crypto.randomUUID()

module.exports = {
  REDSTONE_RULES,
  extractFencedMarkdown,
  titleFromInstruction,
  proposeHeuristic,
  proposeViaHttp,
  buildChatMessageId,
  buildProposalId
}
