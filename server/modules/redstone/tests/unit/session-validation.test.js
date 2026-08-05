const {
  validateSlug,
  validateCreatePayload,
  buildWikiPath,
  normalizeSlug
} = require('../../domain/session-validation')

describe('session-validation', () => {
  describe('validateSlug', () => {
    it('accepte un slug valide', () => {
      expect(validateSlug('fr-quiris-admin-m365')).toEqual({
        ok: true,
        value: 'fr-quiris-admin-m365'
      })
    })

    it('normalise en minuscules', () => {
      expect(validateSlug('  FR-Test  ')).toEqual({
        ok: true,
        value: 'fr-test'
      })
    })

    it('rejette un slug vide', () => {
      expect(validateSlug('')).toMatchObject({ ok: false, code: 'slug_required' })
    })

    it('rejette un slug avec caractères invalides', () => {
      expect(validateSlug('bad_slug!')).toMatchObject({ ok: false, code: 'slug_invalid' })
    })

    it('rejette un slug trop court (1 char)', () => {
      expect(validateSlug('a')).toMatchObject({ ok: false, code: 'slug_invalid' })
    })
  })

  describe('buildWikiPath', () => {
    it('dérive le chemin wiki', () => {
      expect(buildWikiPath('my-formation')).toBe('/formations/my-formation')
    })
  })

  describe('validateCreatePayload', () => {
    const valid = {
      slug: 'rdf-test-e2e',
      monday_item_id: 12718272029,
      client: 'RDF',
      title: 'TEST E2E pipeline'
    }

    it('valide un payload complet', () => {
      const result = validateCreatePayload(valid)
      expect(result.ok).toBe(true)
      expect(result.value.slug).toBe('rdf-test-e2e')
      expect(result.value.mondayItemId).toBe(12718272029)
      expect(result.value.state).toBe('draft')
    })

    it('rejette monday_item_id invalide', () => {
      const result = validateCreatePayload({ ...valid, monday_item_id: 'abc' })
      expect(result.ok).toBe(false)
      expect(result.code).toBe('monday_item_id_invalid')
    })

    it('rejette client manquant', () => {
      const result = validateCreatePayload({ ...valid, client: '' })
      expect(result.ok).toBe(false)
    })

    it('utilise fr comme locale par défaut', () => {
      const result = validateCreatePayload(valid)
      expect(result.value.localeDefault).toBe('fr')
    })
  })

  describe('normalizeSlug', () => {
    it('trim et lowercase', () => {
      expect(normalizeSlug('  ABC-DEF  ')).toBe('abc-def')
    })
  })
})
