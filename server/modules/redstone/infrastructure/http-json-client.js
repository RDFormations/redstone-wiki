/**
 * Client HTTP JSON pour appels sortants LMS (chatbot, webhooks).
 *
 * Responsabilité :
 * - POST JSON via modules Node http/https (pas fetch/undici — instable en conteneur wiki)
 * - Messages d'erreur explicites (URL invalide, ECONNREFUSED, timeout)
 *
 * Points prod critiques :
 * - Ne pas réintroduire globalThis.fetch dans chatbot-propose (régression fetch invalid)
 * - timeoutMs long (180s) : cursor-sdk / agent-gateway peut prendre ~30–60s
 */
const http = require('http')
const https = require('https')

/**
 * POST JSON — client HTTP Node (pas fetch/undici) pour appels depuis conteneur wiki.
 * @returns {Promise<{ status: number, body: string }>}
 */
const postJson = (url, { headers = {}, body, timeoutMs = 180000 } = {}) =>
  new Promise((resolve, reject) => {
    let parsed
    try {
      parsed = new URL(url)
    } catch (err) {
      reject(new Error(`URL chatbot invalide : ${url}`))
      return
    }
    const transport = parsed.protocol === 'https:' ? https : http
    const payload = JSON.stringify(body)
    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers
        },
        timeout: timeoutMs
      },
      res => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') })
        })
      }
    )
    req.on('error', err => {
      reject(new Error(`Connexion chatbot impossible (${parsed.host}) : ${err.message}`))
    })
    req.on('timeout', () => req.destroy(new Error('Assistant édition : timeout')))
    req.write(payload)
    req.end()
  })

module.exports = { postJson }
