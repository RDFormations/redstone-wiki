const { qrSvgForUrl } = require('../../domain/qr-svg')

describe('qr-svg domain', () => {
  it('génère un SVG pour une URL valide', () => {
    const svg = qrSvgForUrl('https://formation.redstoneformations.fr/fr/formations/test/stagiaire')
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('retourne une chaîne vide si URL absente', () => {
    expect(qrSvgForUrl('')).toBe('')
    expect(qrSvgForUrl(null)).toBe('')
  })
})
