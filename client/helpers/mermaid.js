import mermaid from 'mermaid'

const LIGHT_THEME_VARS = {
  primaryColor: '#ede9fe',
  primaryTextColor: '#210051',
  primaryBorderColor: '#7c3aed',
  lineColor: '#5b21b6',
  secondaryColor: '#f5f0ff',
  tertiaryColor: '#faf5ff',
  mainBkg: '#ffffff',
  secondBkg: '#f5f0ff',
  tertiaryBkg: '#faf5ff',
  clusterBkg: '#f3e8ff',
  titleColor: '#210051',
  edgeLabelBackground: '#ffffff',
  actorBkg: '#ede9fe',
  actorTextColor: '#210051',
  actorLineColor: '#7c3aed',
  signalColor: '#5b21b6',
  signalTextColor: '#210051',
  labelBoxBkgColor: '#ede9fe',
  labelBoxBorderColor: '#7c3aed',
  labelTextColor: '#210051',
  loopTextColor: '#210051',
  noteBkgColor: '#fef3c7',
  noteTextColor: '#78350f',
  fontFamily: 'Roboto, system-ui, -apple-system, sans-serif',
  fontSize: '14px'
}

const DARK_THEME_VARS = {
  primaryColor: '#2d1b4e',
  primaryTextColor: '#ede9fe',
  primaryBorderColor: '#a78bfa',
  lineColor: '#c4b5fd',
  secondaryColor: '#1a1033',
  tertiaryColor: '#251545',
  mainBkg: '#1e1830',
  secondBkg: '#251545',
  tertiaryBkg: '#2d1b4e',
  clusterBkg: '#1a1033',
  titleColor: '#e9d5ff',
  edgeLabelBackground: '#1e1830',
  actorBkg: '#2d1b4e',
  actorTextColor: '#ede9fe',
  actorLineColor: '#a78bfa',
  signalColor: '#c4b5fd',
  signalTextColor: '#ede9fe',
  labelBoxBkgColor: '#2d1b4e',
  labelBoxBorderColor: '#a78bfa',
  labelTextColor: '#ede9fe',
  loopTextColor: '#e9d5ff',
  noteBkgColor: '#422006',
  noteTextColor: '#fde68a',
  fontFamily: 'Roboto, system-ui, -apple-system, sans-serif',
  fontSize: '14px'
}

const KIND_RULES = [
  ['sequencediagram', 'Séquence'],
  ['classdiagram', 'Classes'],
  ['statediagram', 'États'],
  ['erdiagram', 'ER'],
  ['gantt', 'Gantt'],
  ['pie', 'Camembert'],
  ['journey', 'Parcours'],
  ['mindmap', 'Mind map'],
  ['timeline', 'Timeline'],
  ['gitgraph', 'Git']
]

let mermaidSeq = 0

export function detectMermaidKind (source) {
  const head = String(source || '').trim().split('\n')[0].toLowerCase().replace(/\s/g, '')
  const hit = KIND_RULES.find(([key]) => head.startsWith(key))
  if (hit) return hit[1]
  if (head.startsWith('graph') || head.startsWith('flowchart')) return 'Flowchart'
  return 'Schéma'
}

export function getMermaidConfig (isDark = false) {
  return {
    startOnLoad: false,
    securityLevel: 'loose',
    theme: isDark ? 'dark' : 'default',
    themeVariables: isDark ? DARK_THEME_VARS : LIGHT_THEME_VARS,
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      padding: 14,
      nodeSpacing: 42,
      rankSpacing: 48
    },
    sequence: {
      diagramMarginX: 20,
      diagramMarginY: 14,
      actorMargin: 52,
      boxMargin: 10,
      messageMargin: 36
    }
  }
}

function escapeHtml (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function createActionButton (label, title, onClick) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'rs-mermaid-btn'
  button.textContent = label
  button.title = title
  button.setAttribute('aria-label', title)
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    onClick()
  })
  return button
}

function buildFrame (kind) {
  const frame = document.createElement('div')
  frame.className = 'rs-mermaid'

  const toolbar = document.createElement('div')
  toolbar.className = 'rs-mermaid-toolbar'

  const label = document.createElement('span')
  label.className = 'rs-mermaid-label'

  const icon = document.createElement('span')
  icon.className = 'rs-mermaid-label-icon'
  icon.setAttribute('aria-hidden', 'true')
  label.append(icon, document.createTextNode(` ${kind}`))

  const actions = document.createElement('div')
  actions.className = 'rs-mermaid-actions'

  const viewport = document.createElement('div')
  viewport.className = 'rs-mermaid-viewport'

  const canvas = document.createElement('div')
  canvas.className = 'rs-mermaid-canvas'

  viewport.appendChild(canvas)
  toolbar.append(label, actions)
  frame.append(toolbar, viewport)

  return { frame, actions, canvas }
}

function wireZoomControls (frame, canvas) {
  let scale = 1
  const zoomLabel = { current: '100%' }

  const apply = () => {
    canvas.style.transform = `scale(${scale})`
    zoomLabel.current = `${Math.round(scale * 100)}%`
    frame.dataset.rsMermaidZoom = String(Math.round(scale * 100))
  }

  return {
    zoomLabel,
    zoomIn: () => {
      scale = Math.min(2.5, +(scale + 0.15).toFixed(2))
      apply()
    },
    zoomOut: () => {
      scale = Math.max(0.5, +(scale - 0.15).toFixed(2))
      apply()
    },
    reset: () => {
      scale = 1
      apply()
    },
    apply
  }
}

function wireFullscreen (frame) {
  const onKeyDown = (event) => {
    if (event.key !== 'Escape') return
    if (!frame.classList.contains('rs-mermaid--fullscreen')) return
    frame.classList.remove('rs-mermaid--fullscreen')
    document.body.classList.remove('rs-mermaid-fs-active')
  }

  document.addEventListener('keydown', onKeyDown)
  frame._rsMermaidCleanup = () => document.removeEventListener('keydown', onKeyDown)

  return () => {
    const active = frame.classList.toggle('rs-mermaid--fullscreen')
    document.body.classList.toggle('rs-mermaid-fs-active', active)
  }
}

function normalizeSvg (canvas) {
  const svg = canvas.querySelector('svg')
  if (!svg) return
  svg.removeAttribute('height')
  svg.style.maxWidth = '100%'
  svg.style.height = 'auto'
  svg.style.display = 'block'
  svg.style.margin = '0 auto'
}

function renderDiagram (source, canvas, isDark) {
  const id = `rs-mermaid-${++mermaidSeq}`
  try {
    const svg = mermaid.render(id, source)
    canvas.innerHTML = svg
    normalizeSvg(canvas)
    return true
  } catch (error) {
    canvas.innerHTML = [
      '<div class="rs-mermaid-error">',
      '<strong>Schéma Mermaid invalide</strong>',
      `<pre>${escapeHtml(error.message || String(error))}</pre>`,
      '</div>'
    ].join('')
    return false
  }
}

function collectCandidates (root) {
  const found = []

  root.querySelectorAll('.mermaid:not([data-rs-mermaid-done])').forEach((element) => {
    found.push({ element, source: element.textContent })
  })

  root.querySelectorAll('pre > code.language-mermaid, pre.codeblock-mermaid > code').forEach((code) => {
    if (code.closest('.rs-mermaid')) return
    const pre = code.parentElement
    if (!pre || pre.dataset.rsMermaidDone === '1') return
    found.push({ element: pre, source: code.textContent })
  })

  return found
}

function enhanceOne (element, source, isDark) {
  const trimmed = String(source || '').trim()
  if (!trimmed) return

  const kind = detectMermaidKind(trimmed)
  const { frame, actions, canvas } = buildFrame(kind)
  const zoom = wireZoomControls(frame, canvas)
  const toggleFullscreen = wireFullscreen(frame)

  const zoomOutBtn = createActionButton('−', 'Zoom arrière', zoom.zoomOut)
  const zoomResetBtn = createActionButton('100%', 'Réinitialiser le zoom', zoom.reset)
  const zoomInBtn = createActionButton('+', 'Zoom avant', zoom.zoomIn)
  const fullscreenBtn = createActionButton('⤢', 'Plein écran', toggleFullscreen)

  const syncZoomLabel = () => {
    zoomResetBtn.textContent = zoom.zoomLabel.current
  }

  zoomOutBtn.addEventListener('click', syncZoomLabel)
  zoomInBtn.addEventListener('click', syncZoomLabel)
  zoomResetBtn.addEventListener('click', syncZoomLabel)

  actions.append(zoomOutBtn, zoomResetBtn, zoomInBtn, fullscreenBtn)

  renderDiagram(trimmed, canvas, isDark)
  zoom.apply()
  syncZoomLabel()

  element.dataset.rsMermaidDone = '1'
  element.replaceWith(frame)
  frame.dataset.rsMermaidDone = '1'
}

/**
 * Cadre, thème RedStone, zoom et plein écran pour les blocs Mermaid d'une zone DOM.
 */
export function enhanceMermaidDiagrams (root, { isDark = false } = {}) {
  if (!root?.querySelectorAll) return

  const candidates = collectCandidates(root)
  if (!candidates.length) return

  mermaid.mermaidAPI.initialize(getMermaidConfig(isDark))
  candidates.forEach(({ element, source }) => enhanceOne(element, source, isDark))
}
