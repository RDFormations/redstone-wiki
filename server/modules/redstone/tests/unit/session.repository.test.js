const { rowToSession } = require('../../repository/session.repository')

describe('session.repository rowToSession', () => {
  it('mappe les colonnes camelCase vers snake_case API', () => {
    const row = {
      id: 'uuid-1',
      slug: 'test-slug',
      mondayItemId: 123,
      client: 'RDF',
      refClient: 'REF',
      title: 'Title',
      localeDefault: 'fr',
      state: 'draft',
      startsAt: null,
      endsAt: null,
      wikiPath: '/formations/test-slug',
      metadata: { planning: [] },
      contentReadyAt: null,
      distributedAt: null,
      createdAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:00.000Z'
    }

    expect(rowToSession(row)).toEqual({
      id: 'uuid-1',
      slug: 'test-slug',
      monday_item_id: 123,
      client: 'RDF',
      ref_client: 'REF',
      title: 'Title',
      locale_default: 'fr',
      state: 'draft',
      starts_at: null,
      ends_at: null,
      wiki_path: '/formations/test-slug',
      metadata: { planning: [] },
      content_ready_at: null,
      distributed_at: null,
      created_at: '2026-08-05T00:00:00.000Z',
      updated_at: '2026-08-05T00:00:00.000Z'
    })
  })

  it('retourne null pour une ligne absente', () => {
    expect(rowToSession(null)).toBeNull()
  })
})
