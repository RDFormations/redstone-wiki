/**
 * C13 — proposition de patch MD (human-in-the-loop).
 *
 * Responsabilité :
 * - proposeViaHttp : appelle agent-gateway (ops) et parse { proposed_body_md, summary }
 * - proposeHeuristic : helpers déterministes pour tests unitaires UNIQUEMENT (pas en prod)
 * - extractFencedMarkdown / titleFromInstruction : parsing consignes formateur
 *
 * Points prod critiques :
 * - chatbot.service appelle UNIQUEMENT proposeViaHttp (jamais proposeHeuristic)
 * - Pas de fallback silencieux : toute erreur HTTP remonte au service → 502 chatbot_failed
 * - Payload inclut REDSTONE_RULES + context (session, module, adjacent)
 * - fetchImpl injectable pour tests ; sinon postJson (http-json-client)
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

const LOCALE_LABELS = {
  fr: 'français',
  en: 'anglais'
}

const localeLabel = code => LOCALE_LABELS[code] || String(code || '')

const translateUrl = () => {
  const base = chatbotUrl()
  if (!base) return ''
  const normalized = base.replace(/\/$/, '')
  if (normalized.endsWith('/chatbot')) {
    return `${normalized}/translate`
  }
  return `${normalized}/translate`
}

const parseAgentBody = (json, fieldNames) => {
  for (const field of fieldNames) {
    if (json && json[field] != null) {
      return String(json[field])
    }
  }
  return null
}

const postAgentJson = async ({ url, payload, fetchImpl, errorLabel }) => {
  const token = chatbotToken()
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
    throw new Error(`${errorLabel} (${res.status}) : ${detail}`)
  }

  return JSON.parse(res.body)
}

/**
 * Appel HTTP optionnel vers un agent LLM (REDSTONE_CHATBOT_URL).
 * Corps attendu : { proposed_body_md, summary? }
 */
const proposeViaHttp = async ({ body_md, message, context }, fetchImpl) => {
  const url = chatbotUrl()
  if (!url) {
    throw new Error('REDSTONE_CHATBOT_URL non configuré sur le serveur wiki.')
  }

  const json = await postAgentJson({
    url,
    payload: { message, body_md, context, rules: REDSTONE_RULES },
    fetchImpl,
    errorLabel: 'Assistant édition'
  })
  const proposed = parseAgentBody(json, ['proposed_body_md'])
  if (!proposed) {
    throw new Error('Réponse assistant invalide (proposed_body_md manquant).')
  }
  return {
    proposed_body_md: proposed,
    provider: 'http',
    summary: json.summary || 'Proposition agent distant.'
  }
}

const buildChatMessageId = () => `chat_${crypto.randomUUID()}`

const buildProposalId = () => crypto.randomUUID()

/**
 * Traduction Markdown via agent (REDSTONE_CHATBOT_URL/translate).
 * Corps attendu : { translated_body_md } ou { proposed_body_md }
 */
const translateViaHttp = async (
  { body_md, source_locale, target_locale, context },
  fetchImpl
) => {
  const url = translateUrl()
  if (!url) {
    throw new Error('REDSTONE_CHATBOT_URL non configuré sur le serveur wiki.')
  }

  const fromLabel = localeLabel(source_locale)
  const toLabel = localeLabel(target_locale)
  const payload = {
    mode: 'translate',
    body_md,
    source_locale,
    target_locale,
    context,
    rules: REDSTONE_RULES,
    message: [
      `Traduis ce contenu de cours du ${fromLabel} vers le ${toLabel}.`,
      'Conserve le frontmatter YAML, la structure Markdown, les blocs Mermaid,',
      'les callouts et les identifiants techniques (chemins, slugs, noms de fichiers).'
    ].join(' ')
  }

  const json = await postAgentJson({
    url,
    payload,
    fetchImpl,
    errorLabel: 'Assistant traduction'
  })
  const translated = parseAgentBody(json, ['translated_body_md', 'proposed_body_md'])
  if (!translated) {
    throw new Error('Réponse assistant invalide (translated_body_md manquant).')
  }

  return {
    translated_body_md: translated,
    provider: 'http',
    summary: json.summary || `Traduction ${source_locale} → ${target_locale}.`
  }
}

module.exports = {
  REDSTONE_RULES,
  extractFencedMarkdown,
  titleFromInstruction,
  proposeHeuristic,
  proposeViaHttp,
  translateViaHttp,
  translateUrl,
  localeLabel,
  buildChatMessageId,
  buildProposalId
}
