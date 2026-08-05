const {
  classifyAssetPath,
  FORMATEUR_ASSET_RE,
  NAV_DRAFT_RE,
  NAV_PUBLISHED_RE
} = require('../../api/middleware/enforce-asset-access')

describe('enforce-asset-access E01', () => {
  it('classifie les chemins assets', () => {
    expect(classifyAssetPath('/formateur/test-slug.json')).toBe('formateur')
    expect(classifyAssetPath('/nav/fr-test.json')).toBe('nav_draft')
    expect(classifyAssetPath('/nav/fr-test-published.json')).toBe('nav_published')
    expect(classifyAssetPath('/svg/icon.svg')).toBe('public')
  })

  it('regex stables', () => {
    expect(FORMATEUR_ASSET_RE.test('/formateur/x.json')).toBe(true)
    expect(NAV_DRAFT_RE.test('/nav/slug.json')).toBe(true)
    expect(NAV_PUBLISHED_RE.test('/nav/slug-published.json')).toBe(true)
    expect(NAV_DRAFT_RE.test('/nav/slug-published.json')).toBe(false)
  })
})
