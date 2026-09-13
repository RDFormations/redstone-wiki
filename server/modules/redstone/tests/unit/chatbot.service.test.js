const { createChatbotService } = require('../../services/chatbot.service')
const { parseFormationEditPath, formationEditUrl } = require('../../domain/formation-edit-path')

describe('formation-edit-path (F06)', () => {
  it('parse /formations/slug/edit/module', () => {
    const parsed = parseFormationEditPath('formations/demo/edit/module-01-a')
    expect(parsed.slug).toBe('demo')
    expect(parsed.moduleStem).toBe('module-01-a')
    expect(parsed.hubPath).toBe('formations/demo/edit')
  })

  it('construit une URL locale', () => {
    expect(formationEditUrl('demo', 'module-01-a', 'fr')).toBe(
      '/fr/formations/demo/edit/module-01-a'
    )
  })
})

describe('chatbot.service', () => {
  const session = { id: 's1', slug: 'demo', client: 'X', title: 'Demo', state: 'distributed' }
  const mod = {
    id: 'm1',
    path: 'module-01-a',
    kind: 'module',
    title: 'M1',
    body_md: '# Avant\n'
  }

  it('propose sans écrire (human-in-the-loop)', async () => {
    const created = []
    const prevUrl = process.env.REDSTONE_CHATBOT_URL
    process.env.REDSTONE_CHATBOT_URL = 'http://chatbot.test/propose'
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        proposed_body_md: '# Avant\n\n## exercices\n',
        summary: 'Ajout section exercices'
      })
    })
    const svc = createChatbotService({
      sessionRepo: { findById: async () => session },
      contentRepo: {
        findBySessionAndPath: async () => mod,
        listBySession: async () => [mod]
      },
      contentEdit: { updateModule: jest.fn() },
      proposalRepo: {
        create: async row => {
          created.push(row)
          return row
        }
      },
      fetchImpl
    })
    const result = await svc.propose('s1', {
      path: 'module-01-a',
      message: 'ajoute une section exercices'
    })
    if (prevUrl) process.env.REDSTONE_CHATBOT_URL = prevUrl
    else delete process.env.REDSTONE_CHATBOT_URL
    expect(result.ok).toBe(true)
    expect(result.applied).toBe(false)
    expect(result.proposed_body_md).toContain('## exercices')
    expect(created).toHaveLength(1)
  })

  it('échoue sans fallback heuristique si le chatbot HTTP échoue', async () => {
    const prevUrl = process.env.REDSTONE_CHATBOT_URL
    process.env.REDSTONE_CHATBOT_URL = 'http://chatbot.test/propose'
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => '{"error":{"message":"agent timeout"}}'
    })
    const svc = createChatbotService({
      sessionRepo: { findById: async () => session },
      contentRepo: {
        findBySessionAndPath: async () => mod,
        listBySession: async () => [mod]
      },
      contentEdit: { updateModule: jest.fn() },
      proposalRepo: { create: jest.fn() },
      fetchImpl
    })
    const result = await svc.propose('s1', {
      path: 'module-01-a',
      message: 'enrichis le module'
    })
    if (prevUrl) process.env.REDSTONE_CHATBOT_URL = prevUrl
    else delete process.env.REDSTONE_CHATBOT_URL
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('chatbot_failed')
  })

  it('rejette path ou message manquant', async () => {
    const svc = createChatbotService({
      sessionRepo: { findById: async () => session },
      contentRepo: { findBySessionAndPath: jest.fn(), listBySession: jest.fn() },
      contentEdit: { updateModule: jest.fn() },
      proposalRepo: { create: jest.fn() }
    })
    expect((await svc.propose('s1', { message: 'x' })).error.code).toBe('path_required')
    expect((await svc.propose('s1', { path: 'module-01-a' })).error.code).toBe('message_required')
  })

  it('module introuvable → 404', async () => {
    const svc = createChatbotService({
      sessionRepo: { findById: async () => session },
      contentRepo: {
        findBySessionAndPath: async () => null,
        listBySession: async () => []
      },
      contentEdit: { updateModule: jest.fn() },
      proposalRepo: { create: jest.fn() }
    })
    const result = await svc.propose('s1', { path: 'module-01-a', message: 'test' })
    expect(result.error.code).toBe('module_not_found')
  })

  it('discard annule une proposition', async () => {
    const updateStatus = jest.fn()
    const svc = createChatbotService({
      sessionRepo: { findById: async () => session },
      contentRepo: { findBySessionAndPath: jest.fn(), listBySession: jest.fn() },
      contentEdit: { updateModule: jest.fn() },
      proposalRepo: {
        findById: async () => ({
          id: 'p1',
          session_id: 's1',
          path: 'module-01-a',
          status: 'pending'
        }),
        updateStatus
      }
    })
    const result = await svc.discard('s1', 'p1')
    expect(result.ok).toBe(true)
    expect(updateStatus).toHaveBeenCalledWith('p1', 'discarded')
  })

  it('apply écrit avec source chatbot + chat_message_id', async () => {
    const updateModule = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      version: 3,
      path: 'module-01-a',
      locale: 'fr'
    })
    const svc = createChatbotService({
      sessionRepo: { findById: async () => ({ ...session, locale_default: 'fr' }) },
      contentRepo: {
        findBySessionAndPath: async () => mod,
        listBySession: async () => [mod],
        listBySessionPath: async () => [{ ...mod, locale: 'fr' }]
      },
      contentEdit: { updateModule },
      proposalRepo: {
        findById: async () => ({
          id: 'p1',
          session_id: 's1',
          path: 'module-01-a',
          chat_message_id: 'chat_abc',
          proposed_body_md: '# Après',
          status: 'pending',
          author: 'ops'
        }),
        updateStatus: jest.fn()
      }
    })
    const result = await svc.apply('s1', { proposal_id: 'p1', locale: 'fr' })
    expect(result.ok).toBe(true)
    expect(result.applied).toBe(true)
    expect(updateModule).toHaveBeenCalledWith(
      's1',
      { path: 'module-01-a', body_md: '# Après', locale: 'fr' },
      expect.objectContaining({
        source: 'chatbot',
        chat_message_id: 'chat_abc'
      })
    )
  })

  it('apply traduit les autres locales via agent', async () => {
    const modFr = { ...mod, id: 'm-fr', locale: 'fr' }
    const modEn = { ...mod, id: 'm-en', locale: 'en' }
    const updateModule = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, version: 3, locale: 'fr', unchanged: false })
      .mockResolvedValueOnce({ ok: true, status: 200, version: 3, locale: 'en', unchanged: false })
    const translateImpl = jest.fn().mockResolvedValue({
      translated_body_md: '# After\n',
      provider: 'http'
    })
    const svc = createChatbotService({
      sessionRepo: { findById: async () => ({ ...session, locale_default: 'fr' }) },
      contentRepo: {
        listBySession: async () => [modFr, modEn],
        listBySessionPath: async () => [modFr, modEn]
      },
      contentEdit: { updateModule },
      translateImpl,
      proposalRepo: {
        findById: async () => ({
          id: 'p1',
          session_id: 's1',
          path: 'module-01-a',
          chat_message_id: 'chat_abc',
          proposed_body_md: '# Après',
          status: 'pending',
          author: 'ops'
        }),
        updateStatus: jest.fn()
      }
    })
    const result = await svc.apply('s1', { proposal_id: 'p1', locale: 'fr' })
    expect(result.ok).toBe(true)
    expect(translateImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        body_md: '# Après',
        source_locale: 'fr',
        target_locale: 'en'
      }),
      undefined
    )
    expect(updateModule).toHaveBeenCalledTimes(2)
    expect(updateModule).toHaveBeenNthCalledWith(
      1,
      's1',
      { path: 'module-01-a', body_md: '# Après', locale: 'fr' },
      expect.any(Object)
    )
    expect(updateModule).toHaveBeenNthCalledWith(
      2,
      's1',
      { path: 'module-01-a', body_md: '# After\n', locale: 'en' },
      expect.any(Object)
    )
    expect(result.translated_locales).toEqual(['en'])
    expect(result.synced_locales).toEqual(['fr', 'en'])
  })

  it('propose charge le module de la locale demandée', async () => {
    const prevUrl = process.env.REDSTONE_CHATBOT_URL
    process.env.REDSTONE_CHATBOT_URL = 'http://chatbot.test/propose'
    const findBySessionPathLocale = jest.fn().mockResolvedValue({ ...mod, locale: 'en', body_md: '# EN\n' })
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ proposed_body_md: '# EN\n\n## section\n', summary: 'ok' })
    })
    const svc = createChatbotService({
      sessionRepo: { findById: async () => session },
      contentRepo: {
        findBySessionPathLocale,
        findBySessionAndPath: jest.fn(),
        listBySession: async () => [mod]
      },
      contentEdit: { updateModule: jest.fn() },
      proposalRepo: { create: jest.fn() },
      fetchImpl
    })
    await svc.propose('s1', { path: 'module-01-a', message: 'test', locale: 'en' })
    if (prevUrl) process.env.REDSTONE_CHATBOT_URL = prevUrl
    else delete process.env.REDSTONE_CHATBOT_URL
    expect(findBySessionPathLocale).toHaveBeenCalledWith('s1', 'module-01-a', 'en')
  })
})
