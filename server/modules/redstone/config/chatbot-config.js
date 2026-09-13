/**
 * C13 — configuration chatbot (URL + token).
 *
 * Responsabilité :
 * - Résoudre REDSTONE_CHATBOT_URL / REDSTONE_CHATBOT_TOKEN depuis process.env puis fichiers .env
 * - Garantir que le wiki prod n'appelle jamais un gateway docker local (172.17.0.1) par erreur
 *
 * Points prod critiques (ne pas casser — voir chatbot-prod-regression.test.js) :
 * - agent-gateway est sur ops.redstoneformations.fr (VPS ops), PAS sur le serveur wiki
 * - DEFAULT_OPS_URL est le fallback si l'env contient encore une URL docker bridge héritée
 * - chatbotToken() doit rester synchronisé avec WEBHOOK_SECRET de l'agent-gateway ops
 */
const fs = require('fs')
const path = require('path')

const ENV_FILES = [
  process.env.REDSTONE_WIKI_ENV_FILE,
  '/opt/redstone-wiki/.env',
  path.join(process.cwd(), 'data', 'redstone-chatbot.env')
].filter(Boolean)

const DEFAULT_LOCAL_URL = 'http://172.17.0.1:9474/lms/chatbot'
const DEFAULT_OPS_URL = 'https://ops.redstoneformations.fr/agent-gateway/lms/chatbot'
const DEFAULT_URL = DEFAULT_OPS_URL

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

const LOCAL_GATEWAY_HOSTS = new Set([
  '127.0.0.1',
  '172.17.0.1',
  'host.docker.internal',
  'localhost'
])

const normalizeUrl = raw => {
  const value = String(raw || '').trim()
  if (!value) return ''
  try {
    const parsed = new URL(value)
    if (!parsed.protocol.startsWith('http')) return ''
    return parsed.toString()
  } catch (_) {
    return ''
  }
}

const isLocalDockerGateway = url => {
  try {
    return LOCAL_GATEWAY_HOSTS.has(new URL(url).hostname)
  } catch (_) {
    return false
  }
}

/**
 * agent-gateway tourne sur ops.redstoneformations.fr (VPS ops), pas sur le wiki prod.
 * Ignorer les URLs docker bridge héritées (172.17.0.1) encore présentes dans .env.
 */
const chatbotUrl = () => {
  const configured =
    normalizeUrl(readKey('REDSTONE_CHATBOT_URL')) ||
    normalizeUrl(readKey('LMS_CHATBOT_URL'))
  if (configured && !isLocalDockerGateway(configured)) {
    return configured
  }
  return DEFAULT_OPS_URL
}

const chatbotToken = () => readKey('REDSTONE_CHATBOT_TOKEN')

module.exports = {
  chatbotUrl,
  chatbotToken,
  DEFAULT_URL,
  DEFAULT_OPS_URL,
  DEFAULT_LOCAL_URL
}
