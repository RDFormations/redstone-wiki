/**
 * E03 — Auth Bearer token (scope minimal F01)
 */

const SCOPE_READ = 'session:read'
const SCOPE_CREATE = 'session:create'

const parseBearer = header => {
  if (!header || typeof header !== 'string') {
    return null
  }
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

const resolveTokenConfig = () => {
  const token = process.env.REDSTONE_LMS_AGENT_TOKEN || process.env.LMS_AGENT_BOT_TOKEN
  const scopes = [SCOPE_READ, SCOPE_CREATE, 'content:import', 'session:distribute']
  return token ? [{ token, scopes, role: 'agent-bot' }] : []
}

const hasScope = (tokenEntry, required) =>
  tokenEntry.scopes.includes('*') || tokenEntry.scopes.includes(required)

const createAuthMiddleware = (options = {}) => {
  const tokens = options.tokens || resolveTokenConfig()
  const allowAnonymousRead = options.allowAnonymousRead === true

  return (req, res, next) => {
    const bearer = parseBearer(req.get('Authorization'))
    const tokenEntry = tokens.find(t => t.token === bearer)

    if (tokenEntry) {
      req.redstoneAuth = { role: tokenEntry.role, scopes: tokenEntry.scopes }
      return next()
    }

    const isRead = req.method === 'GET'
    if (allowAnonymousRead && isRead) {
      req.redstoneAuth = { role: 'anonymous', scopes: [SCOPE_READ] }
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
  createAuthMiddleware,
  requireScope,
  parseBearer,
  resolveTokenConfig
}
