const crypto = require('crypto')
const https = require('https')
const http = require('http')

const RETRY_DELAYS_MS = [0, 1000, 3000]

const signPayload = (secret, body) =>
  crypto.createHmac('sha256', secret).update(body).digest('hex')

const postJson = (url, headers, body) =>
  new Promise((resolve, reject) => {
    const parsed = new URL(url)
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
        timeout: 30000
      },
      res => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => {
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') })
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('Webhook timeout')))
    req.write(payload)
    req.end()
  })

const createWebhooksService = ({ logger = console } = {}) => {
  const url = process.env.REDSTONE_LMS_WEBHOOK_URL || process.env.LMS_WEBHOOK_URL
  const secret = process.env.REDSTONE_LMS_WEBHOOK_SECRET || process.env.LMS_WEBHOOK_SECRET

  const deliver = async (event, payload) => {
    if (!url) return { ok: false, skipped: true, reason: 'no_webhook_url' }

    const envelope = {
      event,
      timestamp: new Date().toISOString(),
      payload
    }
    const bodyStr = JSON.stringify(envelope)
    const headers = { 'X-RedStone-Event': event }
    if (secret) {
      headers['X-RedStone-Signature'] = `sha256=${signPayload(secret, bodyStr)}`
    }

    let lastError = null
    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
      if (RETRY_DELAYS_MS[attempt]) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]))
      }
      try {
        const res = await postJson(url, headers, envelope)
        if (res.status >= 200 && res.status < 300) {
          return { ok: true, status: res.status, attempt: attempt + 1 }
        }
        lastError = new Error(`HTTP ${res.status}: ${res.body.slice(0, 200)}`)
      } catch (err) {
        lastError = err
      }
    }

    logger.warn(`(REDSTONE/LMS) Webhook ${event} échec: ${lastError?.message}`)
    return { ok: false, error: lastError?.message }
  }

  const emit = (event, payload) => {
    setImmediate(() => {
      deliver(event, payload).catch(err => {
        logger.error(`(REDSTONE/LMS) Webhook ${event} crash: ${err.message}`)
      })
    })
  }

  return { emit, deliver }
}

module.exports = { createWebhooksService, signPayload, RETRY_DELAYS_MS }
