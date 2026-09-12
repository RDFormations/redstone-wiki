const fs = require('fs')
const path = require('path')

const ENV_FILES = [
  process.env.REDSTONE_WIKI_ENV_FILE,
  '/opt/redstone-wiki/.env',
  path.join(process.cwd(), 'data', 'redstone-chatbot.env')
].filter(Boolean)

const DEFAULT_URL = 'http://172.17.0.1:9474/lms/chatbot'

const readEnvFile = (filePath, key) => {
  try {
    const text = fs.readFileSync(filePath, 'utf8')
    const line = text.split('\n').find(l => l.startsWith(`${key}=`))
    if (!line) return ''
    return line.slice(key.length + 1).trim()
  } catch (_) {
    return ''
  }
}

const readKey = key => {
  const fromProcess = String(process.env[key] || '').trim()
  if (fromProcess) return fromProcess
  for (const file of ENV_FILES) {
    const value = readEnvFile(file, key)
    if (value) return value
  }
  return ''
}

const chatbotUrl = () => {
  const url = readKey('REDSTONE_CHATBOT_URL') || readKey('LMS_CHATBOT_URL')
  return url || DEFAULT_URL
}

const chatbotToken = () => readKey('REDSTONE_CHATBOT_TOKEN')

module.exports = { chatbotUrl, chatbotToken, DEFAULT_URL }
