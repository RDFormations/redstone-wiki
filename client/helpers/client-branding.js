/**
 * B02 — catalogue OF côté client (fallback si API session absente).
 * Miroir léger de server/.../client-branding.js
 */
export const REDSTONE_DEFAULT = Object.freeze({
  logo_url: '/_assets/svg/redstone-logo.svg',
  primary_color: '#5B21B6',
  accent_color: '#A78BFA',
  source: 'redstone_default',
  client_key: null
})

export const CLIENT_BRANDING_DEFAULTS = Object.freeze({
  quiris: {
    logo_url: '/_assets/branding/quiris/logo.svg',
    primary_color: '#0B3D91',
    accent_color: '#3B82F6'
  },
  m2i: {
    logo_url: '/_assets/branding/m2i/logo.svg',
    primary_color: '#E30613',
    accent_color: '#FF4D57'
  },
  m2iformation: {
    logo_url: '/_assets/branding/m2i/logo.svg',
    primary_color: '#E30613',
    accent_color: '#FF4D57'
  },
  m2iformations: {
    logo_url: '/_assets/branding/m2i/logo.svg',
    primary_color: '#E30613',
    accent_color: '#FF4D57'
  },
  dawan: {
    logo_url: '/_assets/branding/dawan/logo.svg',
    primary_color: '#111827',
    accent_color: '#F59E0B'
  },
  abilways: {
    logo_url: '/_assets/branding/abilways/logo.svg',
    primary_color: '#0F766E',
    accent_color: '#14B8A6'
  },
  supdevinci: {
    logo_url: '/_assets/branding/supdevinci/logo.svg',
    primary_color: '#1D4ED8',
    accent_color: '#60A5FA'
  },
  ipssi: {
    logo_url: '/_assets/branding/ipssi/logo.svg',
    primary_color: '#7C3AED',
    accent_color: '#C4B5FD'
  },
  hb: {
    logo_url: '/_assets/branding/hb/logo.svg',
    primary_color: '#B45309',
    accent_color: '#FBBF24'
  },
  humanbooster: {
    logo_url: '/_assets/branding/hb/logo.svg',
    primary_color: '#B45309',
    accent_color: '#FBBF24'
  }
})

export const normalizeClientKey = (client) =>
  String(client || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()

export const CLIENT_KEY_ALIASES = Object.freeze({
  m2iformation: 'm2i',
  m2iformations: 'm2i',
  humanbooster: 'hb'
})

export const resolveCatalogFromKey = (rawKey) => {
  const key = normalizeClientKey(rawKey)
  if (!key) return null
  const canonical = CLIENT_KEY_ALIASES[key] || key
  if (CLIENT_BRANDING_DEFAULTS[canonical]) {
    return { client_key: canonical, ...CLIENT_BRANDING_DEFAULTS[canonical], source: 'client_catalog' }
  }
  if (CLIENT_BRANDING_DEFAULTS[key]) {
    return { client_key: key, ...CLIENT_BRANDING_DEFAULTS[key], source: 'client_catalog' }
  }
  const hit = Object.keys(CLIENT_BRANDING_DEFAULTS).find(
    (k) => key.startsWith(k) || k.startsWith(key) || key.includes(k) || canonical.startsWith(k)
  )
  if (!hit) return null
  const hitCanonical = CLIENT_KEY_ALIASES[hit] || hit
  const catalog = CLIENT_BRANDING_DEFAULTS[hitCanonical] || CLIENT_BRANDING_DEFAULTS[hit]
  return { client_key: hitCanonical, ...catalog, source: 'client_catalog' }
}

/** Déduit un branding depuis slug formation (ex. quiris-admin-m365) ou nom client. */
export const resolveBrandingHint = ({ slug, client } = {}) => {
  const fromClient = resolveCatalogFromKey(client)
  if (fromClient) return fromClient
  const fromSlug = resolveCatalogFromKey(String(slug || '').replace(/-/g, ''))
  if (fromSlug) return fromSlug
  // slug segments: quiris-admin-m365 → quiris
  const parts = String(slug || '').toLowerCase().split(/[-_/]/)
  for (const part of parts) {
    const hit = resolveCatalogFromKey(part)
    if (hit) return hit
  }
  return { ...REDSTONE_DEFAULT }
}

export const applyBrandCssVars = (branding) => {
  if (!branding || typeof document === 'undefined') return
  const root = document.documentElement
  if (branding.primary_color) {
    root.style.setProperty('--rs-brand-primary', branding.primary_color)
  }
  if (branding.accent_color) {
    root.style.setProperty('--rs-brand-accent', branding.accent_color)
  }
}
