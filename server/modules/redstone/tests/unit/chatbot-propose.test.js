const {
  REDSTONE_RULES,
  extractFencedMarkdown,
  titleFromInstruction,
  proposeHeuristic,
  proposeViaHttp,
  translateViaHttp,
  translateUrl,
  buildChatMessageId,
  buildProposalId
} = require('../../domain/chatbot-propose')
const { DEFAULT_OPS_URL } = require('../../config/chatbot-config')

describe('chatbot-propose — parsing consignes', () => {
  it('extrait un bloc markdown fence', () => {
    expect(extractFencedMarkdown('voici\n```md\n# Hello\n```')).toBe('# Hello')
  })

  it('retourne null sans fence', () => {
    expect(extractFencedMarkdown('texte simple')).toBeNull()
  })

  it('détecte une section à ajouter', () => {
    expect(titleFromInstruction('ajoute une section exercices')).toBe('exercices')
    expect(titleFromInstruction('ajouter une section "Introduction"')).toBe('Introduction')
  })
})

describe('chatbot-propose — heuristique (tests uniquement, pas prod)', () => {
  it('consigne vide → aucune modification', () => {
    const result = proposeHeuristic({ body_md: '# Intro\n', message: '' })
    expect(result.proposed_body_md).toBe('# Intro\n')
    expect(result.provider).toBe('heuristic')
  })

  it('remplace par markdown fence fourni', () => {
    const result = proposeHeuristic({
      body_md: '# Ancien',
      message: '```md\n# Nouveau\n```'
    })
    expect(result.proposed_body_md).toBe('# Nouveau')
  })

  it('ajoute une section absente', () => {
    const result = proposeHeuristic({
      body_md: '# Intro\n',
      message: 'ajoute une section exercices'
    })
    expect(result.proposed_body_md).toContain('## exercices')
  })

  it('ne duplique pas une section existante', () => {
    const result = proposeHeuristic({
      body_md: '# Intro\n\n## exercices\n',
      message: 'ajoute une section exercices'
    })
    expect(result.proposed_body_md).not.toContain('Contenu proposé')
    expect(result.summary).toContain('déjà présente')
  })
})

describe('chatbot-propose — proposeViaHttp', () => {
  const prevEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...prevEnv }
  })

  const mockFetch = body => jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body
  })

  it('envoie message, body_md, context et REDSTONE_RULES', async () => {
    process.env.REDSTONE_CHATBOT_URL = 'https://chatbot.test/propose'
    process.env.REDSTONE_CHATBOT_TOKEN = 'secret-token'
    const fetchImpl = mockFetch({
      proposed_body_md: '# Après\n',
      summary: 'OK'
    })
    await proposeViaHttp(
      { body_md: '# Avant\n', message: 'enrichis', context: { session: { slug: 'demo' } } },
      fetchImpl
    )
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://chatbot.test/propose')
    expect(opts.headers.Authorization).toBe('Bearer secret-token')
    const payload = JSON.parse(opts.body)
    expect(payload.message).toBe('enrichis')
    expect(payload.body_md).toBe('# Avant\n')
    expect(payload.rules).toEqual(REDSTONE_RULES)
    expect(payload.context.session.slug).toBe('demo')
  })

  it('parse une réponse fetch avec .text()', async () => {
    process.env.REDSTONE_CHATBOT_URL = 'https://chatbot.test/propose'
    const fetchImpl = jest.fn().mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ proposed_body_md: '# MD\n', summary: 'S' })
    })
    const result = await proposeViaHttp(
      { body_md: '# Avant', message: 'test', context: {} },
      fetchImpl
    )
    expect(result.proposed_body_md).toBe('# MD\n')
    expect(result.provider).toBe('http')
  })

  it('remonte une erreur HTTP avec détail JSON', async () => {
    process.env.REDSTONE_CHATBOT_URL = 'https://chatbot.test/propose'
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => JSON.stringify({ error: { message: 'agent timeout' } })
    })
    await expect(
      proposeViaHttp({ body_md: '# A', message: 'x', context: {} }, fetchImpl)
    ).rejects.toThrow('Assistant édition (502) : agent timeout')
  })

  it('rejette une réponse sans proposed_body_md', async () => {
    process.env.REDSTONE_CHATBOT_URL = 'https://chatbot.test/propose'
    const fetchImpl = mockFetch({ summary: 'incomplet' })
    await expect(
      proposeViaHttp({ body_md: '# A', message: 'x', context: {} }, fetchImpl)
    ).rejects.toThrow('proposed_body_md manquant')
  })

  it('utilise ops URL quand env contient 172.17.0.1 (régression prod)', async () => {
    process.env.REDSTONE_CHATBOT_URL = 'http://172.17.0.1:9474/lms/chatbot'
    delete process.env.REDSTONE_CHATBOT_TOKEN
    const fetchImpl = mockFetch({ proposed_body_md: '# OK\n' })
    await proposeViaHttp({ body_md: '# A', message: 'x', context: {} }, fetchImpl)
    expect(fetchImpl.mock.calls[0][0]).toBe(DEFAULT_OPS_URL)
  })
})

describe('chatbot-propose — translateViaHttp', () => {
  const prevEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...prevEnv }
  })

  it('utilise la même URL que propose (REDSTONE_CHATBOT_URL)', () => {
    process.env.REDSTONE_CHATBOT_URL = 'https://ops.example.com/lms/chatbot'
    expect(translateUrl()).toBe('https://ops.example.com/lms/chatbot')
  })

  it('envoie source_locale, target_locale et mode translate', async () => {
    process.env.REDSTONE_CHATBOT_URL = 'https://chatbot.test/lms/chatbot'
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ translated_body_md: '# Hello\n' })
    })
    const result = await translateViaHttp(
      {
        body_md: '# Bonjour\n',
        source_locale: 'fr',
        target_locale: 'en',
        context: { session: { slug: 'demo' } }
      },
      fetchImpl
    )
    expect(result.translated_body_md).toBe('# Hello\n')
    const [url, opts] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://chatbot.test/lms/chatbot')
    const payload = JSON.parse(opts.body)
    expect(payload.mode).toBe('translate')
    expect(payload.source_locale).toBe('fr')
    expect(payload.target_locale).toBe('en')
    expect(payload.rules).toEqual(REDSTONE_RULES)
  })
})

describe('chatbot-propose — identifiants', () => {
  it('génère des ids uniques', () => {
    expect(buildChatMessageId()).toMatch(/^chat_/)
    expect(buildProposalId()).toMatch(/^[0-9a-f-]{36}$/i)
    expect(buildChatMessageId()).not.toBe(buildChatMessageId())
  })
})
