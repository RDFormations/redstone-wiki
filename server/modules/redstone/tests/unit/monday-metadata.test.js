const { parseTimeline, mapMondayItemToSessionPatch, mergeSessionMetadata } = require('../../domain/monday-metadata')

describe('monday-metadata', () => {
  it('parseTimeline depuis JSON Monday', () => {
    const col = { value: '{"from":"2026-09-01","to":"2026-09-05"}', text: '2026-09-01 - 2026-09-05' }
    expect(parseTimeline(col)).toEqual({
      starts_at: '2026-09-01',
      ends_at: '2026-09-05',
      planning: [{ day: 1, date: '2026-09-01', modules: [] }]
    })
  })

  it('mapMondayItemToSessionPatch extrait client et ref', () => {
    const item = {
      id: '123',
      name: 'Formation Test',
      column_values: [
        { id: 'dropdown_mm50m6bp', text: 'Quiris', value: '{}' },
        { id: 'text_mm50zqdd', text: 'REF-42', value: '"REF-42"' },
        { id: 'timerange_mm50rjgk', text: '2026-10-01 - 2026-10-03', value: '{"from":"2026-10-01","to":"2026-10-03"}' },
        { id: 'link_mm50j8dk', text: 'Teams', value: '{"url":"https://teams.microsoft.com/l/meetup"}' }
      ]
    }
    const patch = mapMondayItemToSessionPatch(item)
    expect(patch.title).toBe('Formation Test')
    expect(patch.client).toBe('Quiris')
    expect(patch.ref_client).toBe('REF-42')
    expect(patch.starts_at).toBe('2026-10-01')
    expect(patch.metadata.links.teams).toContain('teams.microsoft.com')
  })

  it('mergeSessionMetadata fusionne links et monday', () => {
    const merged = mergeSessionMetadata(
      { links: { emargement: 'https://a' }, monday: { etat: 'Confirmé' } },
      { links: { teams: 'https://b' }, monday: { synced_at: '2026-01-01' } }
    )
    expect(merged.links).toEqual({ emargement: 'https://a', teams: 'https://b' })
    expect(merged.monday.etat).toBe('Confirmé')
    expect(merged.monday.synced_at).toBe('2026-01-01')
  })
})
