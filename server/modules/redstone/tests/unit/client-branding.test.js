const {
  normalizeClientKey,
  isSafeLogoUrl,
  isHexColor,
  resolveClientBranding,
  sanitizeBrandingPatch,
  REDSTONE_DEFAULT,
  CLIENT_BRANDING_DEFAULTS
} = require('../../domain/client-branding')

describe('client-branding (B02)', () => {
  it('normalizeClientKey normalise accents et espaces', () => {
    expect(normalizeClientKey('Quiris')).toBe('quiris')
    expect(normalizeClientKey('Human Booster')).toBe('humanbooster')
    expect(normalizeClientKey('M2i')).toBe('m2i')
  })

  it('résout M2i Formation via préfixe catalogue', () => {
    const branding = resolveClientBranding({ client: 'M2i Formation', metadata: {} })
    expect(branding.source).toBe('client_catalog')
    expect(branding.client_key).toBe('m2i')
  })

  it('résout le client Monday M2I et la couleur rouge marque', () => {
    const branding = resolveClientBranding({ client: 'M2I', metadata: {} })
    expect(branding.source).toBe('client_catalog')
    expect(branding.client_key).toBe('m2i')
    expect(branding.primary_color).toBe('#E30613')
    expect(branding.logo_url).toBe('/_assets/branding/m2i/logo.svg')
  })

  it('résout un slug m2i-* même si client métier ≠ OF', () => {
    const branding = resolveClientBranding({
      client: 'Bourbon',
      slug: 'm2i-bourbon-python-fabric',
      metadata: {}
    })
    expect(branding.source).toBe('client_catalog')
    expect(branding.client_key).toBe('m2i')
    expect(branding.logo_url).toContain('/branding/m2i/')
  })

  it('accepte logos /_assets et https uniquement', () => {
    expect(isSafeLogoUrl('/_assets/branding/quiris/logo.svg')).toBe(true)
    expect(isSafeLogoUrl('https://cdn.example/logo.svg')).toBe(true)
    expect(isSafeLogoUrl('http://insecure/x.png')).toBe(false)
    expect(isSafeLogoUrl('javascript:alert(1)')).toBe(false)
  })

  it('valide les couleurs hex', () => {
    expect(isHexColor('#abc')).toBe(true)
    expect(isHexColor('#0B3D91')).toBe(true)
    expect(isHexColor('red')).toBe(false)
    expect(isHexColor('#gg0000')).toBe(false)
  })

  it('résout le catalogue client quand pas de metadata', () => {
    const branding = resolveClientBranding({ client: 'Quiris', metadata: {} })
    expect(branding.source).toBe('client_catalog')
    expect(branding.logo_url).toBe(CLIENT_BRANDING_DEFAULTS.quiris.logo_url)
    expect(branding.primary_color).toBe(CLIENT_BRANDING_DEFAULTS.quiris.primary_color)
  })

  it('priorise metadata.branding session', () => {
    const branding = resolveClientBranding({
      client: 'Quiris',
      metadata: {
        branding: {
          logo_url: 'https://cdn.example/custom.svg',
          primary_color: '#112233',
          accent_color: '#445566'
        }
      }
    })
    expect(branding.source).toBe('session')
    expect(branding.logo_url).toBe('https://cdn.example/custom.svg')
    expect(branding.primary_color).toBe('#112233')
  })

  it('fallback RedStone pour client inconnu', () => {
    const branding = resolveClientBranding({ client: 'Inconnu SA', metadata: {} })
    expect(branding.source).toBe('redstone_default')
    expect(branding.logo_url).toBe(REDSTONE_DEFAULT.logo_url)
  })

  it('sanitizeBrandingPatch rejette les valeurs invalides', () => {
    const bad = sanitizeBrandingPatch({ logo_url: '/evil', primary_color: 'blue' })
    expect(bad.ok).toBe(false)
    expect(bad.errors.length).toBeGreaterThan(0)
  })

  it('sanitizeBrandingPatch accepte un patch partiel valide', () => {
    const ok = sanitizeBrandingPatch({ primary_color: '#FF00AA', client_key: 'M2i' })
    expect(ok.ok).toBe(true)
    expect(ok.value.primary_color).toBe('#FF00AA')
    expect(ok.value.client_key).toBe('m2i')
  })
})
