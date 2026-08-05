const { toHealthRows } = require('../../domain/health-rows')

describe('health-rows', () => {
  it('ajoute un id UUID à chaque check', () => {
    const rows = toHealthRows([
      { checkId: 'intro_present', level: 'ok', blocking: false }
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].checkId).toBe('intro_present')
    expect(rows[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('gère une liste vide', () => {
    expect(toHealthRows(null)).toEqual([])
    expect(toHealthRows([])).toEqual([])
  })
})
