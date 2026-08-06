const http = require('http')
const https = require('https')
const { siteUrl, requestRaw } = require('./lms-client')

const adminCreds = () => ({
  email: process.env.WIKI_ADMIN_EMAIL || 'admin@redstone.local',
  password: process.env.WIKI_ADMIN_PASSWORD || 'redstone-local-test'
})

const gql = (query, variables = null, token = null) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify({ query, ...(variables ? { variables } : {}) })
    const parsed = new URL(`${siteUrl()}/graphql`)
    const transport = parsed.protocol === 'https:' ? https : http
    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        timeout: 60000
      },
      res => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            if (data.errors) reject(new Error(JSON.stringify(data.errors)))
            else resolve(data.data)
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('GraphQL timeout')))
    req.write(payload)
    req.end()
  })

let cachedJwt = null

const wikiLogin = async (force = false) => {
  if (cachedJwt && !force) return cachedJwt
  const { email, password } = adminCreds()
  const data = await gql(
    'mutation($e:String!,$p:String!){authentication{login(username:$e,password:$p,strategy:"local"){jwt}}}',
    { e: email, p: password }
  )
  cachedJwt = data.authentication.login.jwt
  return cachedJwt
}

const authHeaders = jwt => ({
  Cookie: `jwt=${jwt}`,
  Authorization: `Bearer ${jwt}`
})

/**
 * Appels REST Wiki.js (hors /api/v1 LMS) — proxy formateur, pages, etc.
 */
const wikiApi = async (method, path, { jwt, body, query, useBearer = false } = {}) => {
  const url = new URL(`${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`)
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v != null) url.searchParams.set(k, String(v))
    })
  }
  const headers = jwt
    ? (useBearer ? { Authorization: `Bearer ${jwt}` } : authHeaders(jwt))
    : {}
  return requestRaw(method, url.toString(), { headers, body })
}

const formationApi = (method, slug, subPath, options = {}) => {
  const base = `/api/formation/${encodeURIComponent(slug)}`
  const suffix = subPath.startsWith('/') ? subPath : `/${subPath}`
  return wikiApi(method, `${base}${suffix}`, options)
}

module.exports = {
  adminCreds,
  gql,
  wikiLogin,
  wikiApi,
  formationApi,
  authHeaders
}
