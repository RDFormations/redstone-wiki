const CALLOUT_RE = /^\[!([a-z-]+)\]\s*([\s\S]*)$/i

const DEFAULT_TITLES = {
  note: 'Note',
  info: 'Info',
  tip: 'Astuce',
  success: 'Succès',
  warning: 'Attention',
  danger: 'Danger',
  error: 'Erreur'
}

function parseCallout (text) {
  const m = text.trim().match(CALLOUT_RE)
  if (!m) return null

  const type = m[1].toLowerCase()
  const rest = m[2]
  const nl = rest.indexOf('\n')

  const title = (nl === -1 ? rest : rest.slice(0, nl)).trim()
  const inlineBody = nl === -1 ? '' : rest.slice(nl + 1).trim()

  return {
    type,
    title: title || DEFAULT_TITLES[type] || type.charAt(0).toUpperCase() + type.slice(1),
    inlineBody
  }
}

function appendInlineBody (content, inlineBody) {
  if (!inlineBody) return

  const bodyP = document.createElement('p')
  bodyP.textContent = inlineBody
  content.appendChild(bodyP)
}

/**
 * Transforme les blockquotes Obsidian `> [!note] Titre` en encadrés stylés.
 * Wiki.js / marked rend souvent tout le callout dans un seul <p> (titre + corps séparés par \n).
 */
export function enhanceCallouts (root) {
  if (!root || !root.querySelectorAll) return

  root.querySelectorAll('blockquote').forEach((bq) => {
    if (bq.dataset.rsCalloutDone === '1') return

    const firstP = bq.querySelector('p')
    if (!firstP) return

    const parsed = parseCallout(firstP.textContent)
    if (!parsed) return

    bq.dataset.rsCalloutDone = '1'
    firstP.remove()

    const content = document.createElement('div')
    content.className = 'rs-callout-content'
    appendInlineBody(content, parsed.inlineBody)

    while (bq.firstChild) content.appendChild(bq.firstChild)

    const wrap = document.createElement('div')
    wrap.className = 'rs-callout'
    wrap.setAttribute('data-callout', parsed.type)
    wrap.dataset.rsCalloutDone = '1'

    const titleEl = document.createElement('div')
    titleEl.className = 'rs-callout-title'
    titleEl.textContent = parsed.title

    wrap.appendChild(titleEl)
    if (content.childNodes.length) wrap.appendChild(content)

    bq.replaceWith(wrap)
  })
}
