const { parseSessionListFilters, applyDatePreset, addDays } = require('../../domain/session-filters')

describe('session-filters F13', () => {
  it('parse les query params avec défauts', () => {
    const f = parseSessionListFilters({ q: 'quiris', limit: '10' })
    expect(f.q).toBe('quiris')
    expect(f.limit).toBe(10)
    expect(f.datePreset).toBe('all')
    expect(f.terminated).toBe('all')
  })

  it('addDays', () => {
    expect(addDays('2026-08-05', 7)).toBe('2026-08-12')
  })
})
