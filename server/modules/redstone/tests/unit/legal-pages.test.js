const { LEGAL_PAGES } = require('../../domain/legal-pages')

describe('legal-pages domain', () => {
  it('expose mentions-legales et politique-confidentialite', () => {
    expect(LEGAL_PAGES['mentions-legales'].title).toMatch(/Mentions/)
    expect(LEGAL_PAGES['politique-confidentialite'].body_md).toMatch(/RGPD/)
  })
})
