/**
 * B02 — Branding client (logo + couleurs) par session.
 * Priorité : metadata.branding → catalogue client → RedStone défaut.
 */

const REDSTONE_DEFAULT = Object.freeze({
  logo_url: '/_assets/svg/redstone-logo.svg',
  primary_color: '#5B21B6',
  accent_color: '#A78BFA',
  source: 'redstone_default'
})

/** Catalogues OF connus — logos sous /_assets/branding/<key>/logo.svg */
const CLIENT_BRANDING_DEFAULTS = Object.freeze({
  quiris: {
    logo_url: '/_assets/branding/quiris/logo.svg',
    primary_color: '#0B3D91',
    accent_color: '#3B82F6'
  },
  m2i: {
    logo_url: '/_assets/branding/m2i/logo.svg',
    primary_color: '#C8102E',
    accent_color: '#EF4444'
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

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const normalizeClientKey = client =>
  String(client || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()

const isSafeLogoUrl = url => {
  if (!url || typeof url !== 'string') return false
  const u = url.trim()
  if (u.startsWith('/_assets/')) return true
  if (/^https:\/\//i.test(u)) return true
  return false
}

const isHexColor = value => typeof value === 'string' && HEX_RE.test(value.trim())

const resolveCatalogEntry = key => {
  if (!key) return { key: null, catalog: {} }
  if (CLIENT_BRANDING_DEFAULTS[key]) {
    return { key, catalog: CLIENT_BRANDING_DEFAULTS[key] }
  }
  const hit = Object.keys(CLIENT_BRANDING_DEFAULTS).find(
    k => key.startsWith(k) || k.startsWith(key)
  )
  return hit
    ? { key: hit, catalog: CLIENT_BRANDING_DEFAULTS[hit] }
    : { key, catalog: {} }
}

const resolveClientBranding = session => {
  const meta = (session && session.metadata && session.metadata.branding) || {}
  const rawKey = normalizeClientKey(meta.client_key || (session && session.client))
  const { key, catalog } = resolveCatalogEntry(rawKey)

  const logoUrl = isSafeLogoUrl(meta.logo_url)
    ? meta.logo_url.trim()
    : (catalog.logo_url || REDSTONE_DEFAULT.logo_url)
  const primary = isHexColor(meta.primary_color)
    ? meta.primary_color.trim()
    : (catalog.primary_color || REDSTONE_DEFAULT.primary_color)
  const accent = isHexColor(meta.accent_color)
    ? meta.accent_color.trim()
    : (catalog.accent_color || REDSTONE_DEFAULT.accent_color)

  let source = 'redstone_default'
  if (isSafeLogoUrl(meta.logo_url) || isHexColor(meta.primary_color) || isHexColor(meta.accent_color)) {
    source = 'session'
  } else if (catalog.logo_url) {
    source = 'client_catalog'
  }

  return {
    client_key: key || null,
    logo_url: logoUrl,
    primary_color: primary,
    accent_color: accent,
    source
  }
}

const sanitizeBrandingPatch = (patch = {}) => {
  const out = {}
  const errors = []

  if (patch.logo_url != null) {
    if (!isSafeLogoUrl(patch.logo_url)) {
      errors.push('logo_url doit être /_assets/... ou https://')
    } else {
      out.logo_url = String(patch.logo_url).trim()
    }
  }
  if (patch.primary_color != null) {
    if (!isHexColor(patch.primary_color)) {
      errors.push('primary_color doit être un hex #RGB ou #RRGGBB')
    } else {
      out.primary_color = String(patch.primary_color).trim()
    }
  }
  if (patch.accent_color != null) {
    if (!isHexColor(patch.accent_color)) {
      errors.push('accent_color doit être un hex #RGB ou #RRGGBB')
    } else {
      out.accent_color = String(patch.accent_color).trim()
    }
  }
  if (patch.client_key != null) {
    out.client_key = normalizeClientKey(patch.client_key) || null
  }

  if (errors.length) {
    return { ok: false, errors }
  }
  return { ok: true, value: out }
}

module.exports = {
  REDSTONE_DEFAULT,
  CLIENT_BRANDING_DEFAULTS,
  normalizeClientKey,
  resolveCatalogEntry,
  isSafeLogoUrl,
  isHexColor,
  resolveClientBranding,
  sanitizeBrandingPatch
}
