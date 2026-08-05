const http = require('http')
const https = require('https')

const baseUrl = () =>
  (process.env.LMS_E2E_BASE_URL || 'http://127.0.0.1:3000/api/v1').replace(/\/$/, '')

const siteUrl = () =>
  (process.env.LMS_E2E_SITE_URL || process.env.WIKI_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')

const tokens = () => ({
  agent: process.env.REDSTONE_LMS_AGENT_TOKEN || process.env.LMS_AGENT_BOT_TOKEN || 'dev-local-test-token',
  formateur: process.env.REDSTONE_LMS_FORMATEUR_TOKEN || 'dev-formateur-token',
  ops: process.env.REDSTONE_LMS_OPS_TOKEN || 'dev-ops-token'
})

const requestRaw = (method, url, { headers = {}, body = null, timeoutMs = 120000 } = {}) =>
  new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const transport = parsed.protocol === 'https:' ? https : http
    const payload = body != null ? JSON.stringify(body) : null
    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: {
          Accept: 'application/json',
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
          ...headers
        },
        timeout: timeoutMs
      },
      res => {
        const chunks = []
        res.on('data', chunk => chunks.push(chunk))
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8')
          let json = null
          if (raw) {
            try {
              json = JSON.parse(raw)
            } catch {
              json = { _raw: raw }
            }
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw })
        })
      }
    )
    req.on('timeout', () => req.destroy(new Error(`Timeout ${method} ${url}`)))
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })

const api = (method, path, { token, body, query } = {}) => {
  const url = new URL(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value != null) url.searchParams.set(key, String(value))
    })
  }
  return requestRaw(method, url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body
  })
}

const pingApi = async () => {
  try {
    const res = await api('GET', '/sessions', { token: tokens().agent, query: { limit: 1 } })
    return res.status === 200
  } catch {
    return false
  }
}

const pingSite = path =>
  requestRaw('GET', `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`, { timeoutMs: 30000 })

module.exports = {
  api,
  baseUrl,
  siteUrl,
  tokens,
  pingApi,
  pingSite,
  requestRaw
}
