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
      path: 'module-01-a'
    })
    const svc = createChatbotService({
      sessionRepo: { findById: async () => session },
      contentRepo: {
        findBySessionAndPath: async () => mod,
        listBySession: async () => [mod]
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
    const result = await svc.apply('s1', { proposal_id: 'p1' })
    expect(result.ok).toBe(true)
    expect(result.applied).toBe(true)
    expect(updateModule).toHaveBeenCalledWith(
      's1',
      { path: 'module-01-a', body_md: '# Après' },
      expect.objectContaining({ source: 'chatbot', chat_message_id: 'chat_abc' })
    )
  })
})
