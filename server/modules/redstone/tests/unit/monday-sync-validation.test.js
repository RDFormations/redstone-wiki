const {
  validateMondaySyncPatch,
  applyMetadataMerge
} = require('../../domain/monday-sync-validation')

describe('monday-sync-validation', () => {
  it('rejette les champs non autorisés', () => {
    const result = validateMondaySyncPatch({ state: 'live', title: 'OK' })
    expect(result.ok).toBe(false)
    expect(result.code).toBe('invalid_sync_fields')
  })

  it('valide un patch override minimal', () => {
    const result = validateMondaySyncPatch({
      ref_client: 'REF-99',
      metadata: { links: { teams: 'https://teams.example' } }
    })
    expect(result.ok).toBe(true)
    expect(result.value.ref_client).toBe('REF-99')
  })

  it('fusionne metadata sans écraser les clés existantes', () => {
    const merged = applyMetadataMerge(
      { metadata: { links: { emargement: 'https://a' }, monday: { etat: 'Confirmé' } } },
      { metadata: { links: { teams: 'https://b' } } }
    )
    expect(merged.metadata.links).toEqual({
      emargement: 'https://a',
      teams: 'https://b'
    })
    expect(merged.metadata.monday.etat).toBe('Confirmé')
  })
})
