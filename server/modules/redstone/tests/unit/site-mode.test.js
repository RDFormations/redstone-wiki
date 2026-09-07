const { isFormationMode } = require('../../domain/site-mode')

describe('site-mode F07', () => {
  it('actif si REDSTONE_SITE_MODE=formation', () => {
    expect(isFormationMode({ REDSTONE_SITE_MODE: 'formation' })).toBe(true)
    expect(isFormationMode({ REDSTONE_SITE_MODE: 'Formation' })).toBe(true)
  })

  it('inactif sinon', () => {
    expect(isFormationMode({ REDSTONE_SITE_MODE: 'wiki' })).toBe(false)
    expect(isFormationMode({})).toBe(false)
    expect(isFormationMode({ REDSTONE_SITE_MODE: '  ' })).toBe(false)
  })
})
