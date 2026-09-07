const { messageFor } = require('./session-state')
const { qrSvgForUrl } = require('./qr-svg')
const { resolveClientBranding } = require('./client-branding')

const PUBLIC_HUB_STATES = new Set(['draft_ready', 'distributed', 'live', 'archived'])

const isoDate = value => {
  if (!value) return ''
  const raw = String(value)
  return raw.includes('T') ? raw.split('T')[0] : raw.slice(0, 10)
}

const siteBase = host => String(host || 'https://formation.redstoneformations.fr').replace(/\/$/, '')

const buildStagiaireLinks = (session, { siteHost, supportUrl }) => {
  const meta = session.metadata || {}
  const links = meta.links || {}
  const distributed = ['distributed', 'live', 'archived'].includes(session.state)
  const locale = session.locale_default || 'fr'
  const host = siteBase(siteHost)

  return [
    {
      id: 'support',
      label: 'Support de cours',
      description: 'Modules, exercices et annexes',
      url: distributed ? supportUrl : '',
      icon: 'mdi-book-open-page-variant',
      primary: true
    },
    {
      id: 'emargement',
      label: 'Émargement',
      description: 'Signature obligatoire — à compléter avant la session',
      url: links.emargement || '',
      icon: 'mdi-clipboard-check-outline',
      primary: true
    },
    {
      id: 'teams',
      label: 'Rejoindre la classe Teams',
      description: 'Lien communiqué par le formateur',
      url: links.teams || '',
      icon: 'mdi-microsoft-teams',
      primary: true
    },
    {
      id: 'contact',
      label: 'Contacter RedStone',
      description: 'Question sur la formation',
      url: 'mailto:contact@redstoneformations.fr',
      icon: 'mdi-email-outline'
    },
    {
      id: 'legal',
      label: 'Mentions légales',
      description: 'Politique de confidentialité et RGPD',
      url: `${host}/${locale}/mentions-legales`,
      icon: 'mdi-shield-account-outline'
    }
  ]
}

const buildStagiaireHub = (session, options = {}) => {
  const locale = session.locale_default || 'fr'
  const host = siteBase(options.siteHost)
  const slug = session.slug
  const portalPath = `/formations/${slug}`
  const stagiairePath = `/formations/${slug}/stagiaire`
  const meta = session.metadata || {}

  return {
    slug,
    lang: locale,
    base_slug: slug,
    title: session.title,
    client: session.client,
    state: session.state,
    portalUrl: `${host}${portalPath}`,
    stagiaireUrl: `${host}/${locale}${stagiairePath}`,
    welcome: messageFor(session.state, 'stagiaire'),
    dates: {
      start: isoDate(session.starts_at),
      end: isoDate(session.ends_at)
    },
    location: meta.location || '',
    modality: meta.modality || meta.monday?.modalite || '',
    reference: session.ref_client || '',
    trainer: meta.formateur || meta.monday?.formateur || '',
    links: buildStagiaireLinks(session, {
      siteHost: host,
      supportUrl: `${host}${portalPath}`
    }),
    labs: meta.labs || [],
    qrSvg: qrSvgForUrl(`${host}/${locale}${stagiairePath}`),
    branding: resolveClientBranding(session)
  }
}

const isPublicHubVisible = state => PUBLIC_HUB_STATES.has(state)

module.exports = {
  PUBLIC_HUB_STATES,
  buildStagiaireHub,
  isPublicHubVisible,
  isoDate,
  siteBase
}
