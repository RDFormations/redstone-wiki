const fs = require('fs')
const {
  chatbotUrl,
  chatbotToken,
  DEFAULT_OPS_URL,
  DEFAULT_LOCAL_URL
} = require('../../config/chatbot-config')

/** Isole process.env — ignore /opt/redstone-wiki/.env sur la machine de test. */
const isolateEnvFiles = () =>
  jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
    const err = new Error('ENOENT')
    err.code = 'ENOENT'
    throw err
  })

describe('chatbot-config — résolution URL', () => {
  const prev = { ...process.env }
  let readFileSpy

  beforeEach(() => {
    readFileSpy = isolateEnvFiles()
  })

  afterEach(() => {
    process.env = { ...prev }
    readFileSpy.mockRestore()
  })

  it('ignore 172.17.0.1 et utilise ops par défaut', () => {
    process.env.REDSTONE_CHATBOT_URL = DEFAULT_LOCAL_URL
    expect(chatbotUrl()).toBe(DEFAULT_OPS_URL)
  })

  it('ignore host.docker.internal', () => {
    process.env.REDSTONE_CHATBOT_URL = 'http://host.docker.internal:9474/lms/chatbot'
    expect(chatbotUrl()).toBe(DEFAULT_OPS_URL)
  })

  it('ignore localhost', () => {
    process.env.REDSTONE_CHATBOT_URL = 'http://localhost:9474/lms/chatbot'
    expect(chatbotUrl()).toBe(DEFAULT_OPS_URL)
  })

  it('conserve une URL ops explicite', () => {
    const custom = 'https://ops.example.com/agent-gateway/lms/chatbot'
    process.env.REDSTONE_CHATBOT_URL = custom
    expect(chatbotUrl()).toBe(custom)
  })

  it('lit LMS_CHATBOT_URL si REDSTONE_CHATBOT_URL absent', () => {
    delete process.env.REDSTONE_CHATBOT_URL
    process.env.LMS_CHATBOT_URL = 'https://ops.example.com/lms/chatbot'
    expect(chatbotUrl()).toBe('https://ops.example.com/lms/chatbot')
  })

  it('ignore LMS_CHATBOT_URL locale', () => {
    process.env.LMS_CHATBOT_URL = DEFAULT_LOCAL_URL
    expect(chatbotUrl()).toBe(DEFAULT_OPS_URL)
  })

  it('fallback ops si env vide', () => {
    delete process.env.REDSTONE_CHATBOT_URL
    delete process.env.LMS_CHATBOT_URL
    expect(chatbotUrl()).toBe(DEFAULT_OPS_URL)
  })
})

describe('chatbot-config — token', () => {
  const prev = { ...process.env }
  let readFileSpy

  beforeEach(() => {
    readFileSpy = isolateEnvFiles()
  })

  afterEach(() => {
    process.env = { ...prev }
    readFileSpy.mockRestore()
  })

  it('lit REDSTONE_CHATBOT_TOKEN depuis process.env', () => {
    process.env.REDSTONE_CHATBOT_TOKEN = 'my-token'
    expect(chatbotToken()).toBe('my-token')
  })

  it('retourne vide si token absent', () => {
    delete process.env.REDSTONE_CHATBOT_TOKEN
    expect(chatbotToken()).toBe('')
  })
})
