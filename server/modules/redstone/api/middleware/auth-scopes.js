/**
 * E03 — Auth Bearer token (scopes LMS)
 */

const SCOPE_READ = 'session:read'
const SCOPE_CREATE = 'session:create'
const SCOPE_IMPORT = 'content:import'
const SCOPE_DISTRIBUTE = 'session:distribute'
const SCOPE_PUBLISH = 'content:publish'
const SCOPE_EDIT = 'content:edit'
const SCOPE_SYNC = 'session:sync'

const ALL_AGENT_SCOPES = [
  SCOPE_READ,
  SCOPE_CREATE,
  SCOPE_IMPORT,
  SCOPE_DISTRIBUTE,
  SCOPE_SYNC
]

const ALL_FORMATEUR_SCOPES = [
  SCOPE_READ,
  SCOPE_PUBLISH,
  SCOPE_EDIT
]

const parseBearer = header => {
  if (!header || typeof header !== 'string') return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

const resolveTokenConfig = () => {
  const tokens = []
  const agentToken = process.env.REDSTONE_LMS_AGENT_TOKEN || process.env.LMS_AGENT_BOT_TOKEN
  const formateurToken = process.env.REDSTONE_LMS_FORMATEUR_TOKEN
  const opsToken = process.env.REDSTONE_LMS_OPS_TOKEN

  if (agentToken) {
    tokens.push({ token: agentToken, scopes: ALL_AGENT_SCOPES, role: 'agent-bot' })
  }
  if (formateurToken) {
    tokens.push({ token: formateurToken, scopes: [...ALL_FORMATEUR_SCOPES, SCOPE_PUBLISH], role: 'formateur' })
  }
  if (opsToken) {
    tokens.push({
      token: opsToken,
      scopes: ['*'],
      role: 'ops'
    })
  }
  return tokens
}

const hasScope = (tokenEntry, required) =>
  tokenEntry.scopes.includes('*') || tokenEntry.scopes.includes(required)

const createAuthMiddleware = (options = {}) => {
  const tokens = options.tokens || resolveTokenConfig()

  return (req, res, next) => {
    const bearer = parseBearer(req.get('Authorization'))
    const tokenEntry = tokens.find(t => t.token === bearer)

    if (tokenEntry) {
      req.redstoneAuth = { role: tokenEntry.role, scopes: tokenEntry.scopes }
      return next()
    }

    if (!tokens.length && process.env.NODE_ENV === 'test') {
      req.redstoneAuth = { role: 'test', scopes: ['*'] }
      return next()
    }

    return res.status(401).json({
      error: {
        code: 'unauthorized',
        message: 'Token API invalide ou absent.'
      }
    })
  }
}

const requireScope = scope => (req, res, next) => {
  const auth = req.redstoneAuth
  if (auth && (auth.scopes.includes('*') || auth.scopes.includes(scope))) {
    return next()
  }
  return res.status(403).json({
    error: {
      code: 'forbidden',
      message: 'Permissions insuffisantes pour cette action.'
    }
  })
}

module.exports = {
  SCOPE_READ,
  SCOPE_CREATE,
  SCOPE_IMPORT,
  SCOPE_DISTRIBUTE,
  SCOPE_PUBLISH,
  SCOPE_EDIT,
  SCOPE_SYNC,
  createAuthMiddleware,
  requireScope,
  parseBearer,
  resolveTokenConfig,
  hasScope
}
