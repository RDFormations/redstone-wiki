const {
  chatbotUrl,
  DEFAULT_OPS_URL,
  DEFAULT_LOCAL_URL
} = require('../../config/chatbot-config')

describe('chatbot-config', () => {
  const prev = { ...process.env }

  afterEach(() => {
    process.env = { ...prev }
  })

  it('ignore 172.17.0.1 et utilise ops par défaut', () => {
    process.env.REDSTONE_CHATBOT_URL = DEFAULT_LOCAL_URL
    expect(chatbotUrl()).toBe(DEFAULT_OPS_URL)
  })

  it('conserve une URL ops explicite', () => {
    const custom = 'https://ops.example.com/agent-gateway/lms/chatbot'
    process.env.REDSTONE_CHATBOT_URL = custom
    expect(chatbotUrl()).toBe(custom)
  })
})
