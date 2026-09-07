const {
  proposeHeuristic,
  extractFencedMarkdown,
  titleFromInstruction
} = require('../../domain/chatbot-propose')
const { createChatbotService } = require('../../services/chatbot.service')
const { parseFormationEditPath, formationEditUrl } = require('../../domain/formation-edit-path')

describe('chatbot-propose domain (C13)', () => {
  it('extrait un fence markdown', () => {
    expect(extractFencedMarkdown('voici\n```md\n# Hello\n```')).toBe('# Hello')
  })

  it('détecte une section à ajouter', () => {
    expect(titleFromInstruction('ajoute une section exercices')).toBe('exercices')
  })

  it('ajoute une section absente', () => {
    const result = proposeHeuristic({
      body_md: '# Intro\n',
      message: 'ajoute une section exercices'
    })
    expect(result.proposed_body_md).toContain('## exercices')
    expect(result.provider).toBe('heuristic')
  })
})

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
      }
    })
    const result = await svc.propose('s1', {
      path: 'module-01-a',
      message: 'ajoute une section exercices'
    })
    expect(result.ok).toBe(true)
    expect(result.applied).toBe(false)
    expect(result.proposed_body_md).toContain('## exercices')
    expect(created).toHaveLength(1)
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
