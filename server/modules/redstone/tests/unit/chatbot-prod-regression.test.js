/**
 * Régressions prod — invariants C13 chatbot édition.
 * Toute modification des fichiers chatbot-*.js doit faire passer cette suite.
 */
const fs = require('fs')
const path = require('path')
const { chatbotUrl, chatbotToken, DEFAULT_OPS_URL } = require('../../config/chatbot-config')
const { proposeViaHttp, proposeHeuristic } = require('../../domain/chatbot-propose')
const { createChatbotService } = require('../../services/chatbot.service')

describe('REGRESSION prod — résolution URL chatbot', () => {
  const prev = { ...process.env }
  let readFileSpy

  beforeEach(() => {
    readFileSpy = jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      const err = new Error('ENOENT')
      err.code = 'ENOENT'
      throw err
    })
  })

  afterEach(() => {
    process.env = { ...prev }
    readFileSpy.mockRestore()
  })

  it('REGRESSION: 172.17.0.1 → ops.redstoneformations.fr', () => {
    process.env.REDSTONE_CHATBOT_URL = 'http://172.17.0.1:9474/lms/chatbot'
    expect(chatbotUrl()).toBe(DEFAULT_OPS_URL)
    expect(chatbotUrl()).toContain('ops.redstoneformations.fr')
  })

  it('REGRESSION: localhost / host.docker.internal → ops', () => {
    process.env.REDSTONE_CHATBOT_URL = 'http://host.docker.internal:9474/lms/chatbot'
    expect(chatbotUrl()).toBe(DEFAULT_OPS_URL)
    process.env.REDSTONE_CHATBOT_URL = 'http://127.0.0.1:9474/lms/chatbot'
    expect(chatbotUrl()).toBe(DEFAULT_OPS_URL)
  })

  it('REGRESSION: URL ops explicite conservée', () => {
    const url = 'https://ops.redstoneformations.fr/agent-gateway/lms/chatbot'
    process.env.REDSTONE_CHATBOT_URL = url
    expect(chatbotUrl()).toBe(url)
  })

  it('REGRESSION: env vide → ops par défaut', () => {
    delete process.env.REDSTONE_CHATBOT_URL
    delete process.env.LMS_CHATBOT_URL
    expect(chatbotUrl()).toBe(DEFAULT_OPS_URL)
  })
})

describe('REGRESSION prod — pas de fallback heuristique', () => {
  const session = { id: 's1', slug: 'demo', client: 'X', title: 'Demo', state: 'distributed' }
  const mod = { path: 'module-01', kind: 'module', title: 'M1', body_md: '# Avant\n' }

  it('REGRESSION: échec HTTP → 502 chatbot_failed, pas de Note assistant', async () => {
    process.env.REDSTONE_CHATBOT_URL = 'https://ops.example.com/lms/chatbot'
    const fetchImpl = jest.fn().mockRejectedValue(
      new Error('Connexion chatbot impossible (172.17.0.1:9474) : connect ECONNREFUSED')
    )
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
    const result = await svc.propose('s1', { path: 'module-01', message: 'enrichis' })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('chatbot_failed')
    expect(result.error.message).toContain('ECONNREFUSED')
    expect(result.proposed_body_md).toBeUndefined()
    const heuristic = proposeHeuristic({ body_md: mod.body_md, message: 'enrichis' })
    expect(heuristic.proposed_body_md).toContain('Note assistant')
    expect(result.error.message).not.toContain('Note assistant')
  })

  it('REGRESSION: propose ne publie pas (applied:false)', async () => {
    process.env.REDSTONE_CHATBOT_URL = 'https://ops.example.com/lms/chatbot'
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ proposed_body_md: '# Après\n', summary: 'OK' })
    })
    const svc = createChatbotService({
      sessionRepo: { findById: async () => session },
      contentRepo: {
        findBySessionAndPath: async () => mod,
        listBySession: async () => [mod]
      },
      contentEdit: { updateModule: jest.fn() },
      proposalRepo: { create: async row => row },
      fetchImpl
    })
    const result = await svc.propose('s1', { path: 'module-01', message: 'test' })
    expect(result.ok).toBe(true)
    expect(result.applied).toBe(false)
  })
})

describe('REGRESSION prod — proposeViaHttp via ops', () => {
  const prev = { ...process.env }
  let readFileSpy

  beforeEach(() => {
    readFileSpy = jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      const err = new Error('ENOENT')
      err.code = 'ENOENT'
      throw err
    })
  })

  afterEach(() => {
    process.env = { ...prev }
    readFileSpy.mockRestore()
  })

  it('REGRESSION: token Bearer transmis à agent-gateway', async () => {
    process.env.REDSTONE_CHATBOT_URL = 'https://ops.redstoneformations.fr/agent-gateway/lms/chatbot'
    process.env.REDSTONE_CHATBOT_TOKEN = 'prod-secret'
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ proposed_body_md: '# X\n' })
    })
    await proposeViaHttp({ body_md: '# A', message: 'm', context: {} }, fetchImpl)
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer prod-secret')
  })
})

describe('REGRESSION prod — scripts deploy', () => {
  it('REGRESSION: ensure-chatbot-env force ops si gateway local', () => {
    const script = fs.readFileSync(
      path.join(__dirname, '../../../../..', 'scripts', 'ensure-chatbot-env.sh'),
      'utf8'
    )
    expect(script).toContain('ops.redstoneformations.fr/agent-gateway/lms/chatbot')
    expect(script).toContain('172.17.0.1')
    expect(script).toMatch(/CHATBOT_URL="\$OPS_CHATBOT_URL"/)
  })

  it('REGRESSION: docker-compose prod default URL ops', () => {
    const compose = fs.readFileSync(
      path.join(__dirname, '../../../../..', 'deploy', 'docker-compose.prod.yml'),
      'utf8'
    )
    expect(compose).toContain('ops.redstoneformations.fr/agent-gateway/lms/chatbot')
  })
})
