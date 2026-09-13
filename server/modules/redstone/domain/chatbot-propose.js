/**
 * C13 — proposition de patch MD (human-in-the-loop).
 * Provider heuristique déterministe (tests / sans clé LLM) + hook HTTP optionnel.
 */

const crypto = require('crypto')
const { chatbotUrl, chatbotToken } = require('../config/chatbot-config')
const { postJson } = require('../infrastructure/http-json-client')

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
  const url = chatbotUrl()
  const token = chatbotToken()
  if (!url) {
    throw new Error('REDSTONE_CHATBOT_URL non configuré sur le serveur wiki.')
  }

  const payload = { message, body_md, context, rules: REDSTONE_RULES }
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  let res
  if (fetchImpl) {
    const fetchRes = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload)
    })
    if (typeof fetchRes.text === 'function') {
      res = { status: fetchRes.status, body: await fetchRes.text() }
    } else if (typeof fetchRes.json === 'function') {
      const json = await fetchRes.json()
      res = {
        status: fetchRes.status ?? (fetchRes.ok ? 200 : 502),
        body: JSON.stringify(json)
      }
    } else {
      res = fetchRes
    }
  } else {
    res = await postJson(url, { headers, body: payload })
  }

  if (res.status < 200 || res.status >= 300) {
    let detail = res.body.slice(0, 300)
    try {
      const parsed = JSON.parse(res.body)
      detail = parsed?.error?.message || detail
    } catch (_) {
      /* raw text */
    }
    throw new Error(`Assistant édition (${res.status}) : ${detail}`)
  }
  const json = JSON.parse(res.body)
  if (!json || json.proposed_body_md == null) {
    throw new Error('Réponse assistant invalide (proposed_body_md manquant).')
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
