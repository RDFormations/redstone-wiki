const crypto = require('crypto')
const { isKnownEvent } = require('../domain/webhook-events')
const { MAX_ATTEMPTS } = require('../repository/webhook-outbox.repository')

const RETRY_DELAYS_MS = [0, 1000, 3000]

const signPayload = (secret, body) =>
  crypto.createHmac('sha256', secret).update(body).digest('hex')

const createHttpTransport = () => {
  const https = require('https')
  const http = require('http')

  return (url, headers, body) =>
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
}

const createWebhooksService = ({
  outboxRepo,
  logger = console,
  transport = createHttpTransport(),
  config = {}
} = {}) => {
  const url = config.url || process.env.REDSTONE_LMS_WEBHOOK_URL || process.env.LMS_WEBHOOK_URL
  const secret = config.secret || process.env.REDSTONE_LMS_WEBHOOK_SECRET || process.env.LMS_WEBHOOK_SECRET

  const buildEnvelope = (event, payload) => ({
    event,
    timestamp: new Date().toISOString(),
    payload
  })

  const deliverHttp = async (event, payload) => {
    if (!url) {
      return { ok: false, skipped: true, reason: 'no_webhook_url' }
    }

    const envelope = buildEnvelope(event, payload)
    const bodyStr = JSON.stringify(envelope)
    const headers = { 'X-RedStone-Event': event }
    if (secret) {
      headers['X-RedStone-Signature'] = `sha256=${signPayload(secret, bodyStr)}`
    }

    const res = await transport(url, headers, envelope)
    if (res.status >= 200 && res.status < 300) {
      return { ok: true, status: res.status }
    }
    throw new Error(`HTTP ${res.status}: ${res.body.slice(0, 200)}`)
  }

  const processEntry = async entry => {
    if (!entry || entry.status !== 'pending') return entry

    const attempt = entry.attempts + 1
    const delay = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)]
    if (delay) {
      await new Promise(r => setTimeout(r, delay))
    }

    try {
      const result = await deliverHttp(entry.event, entry.payload)
      if (result.skipped) {
        return outboxRepo.markRetry(entry.id, {
          attempts: attempt,
          lastError: result.reason,
          nextRetryAt: new Date(Date.now() + 60000).toISOString()
        })
      }
      return outboxRepo.markDelivered(entry.id)
    } catch (err) {
      const nextRetryAt =
        attempt < MAX_ATTEMPTS
          ? new Date(Date.now() + RETRY_DELAYS_MS[attempt] || 3000).toISOString()
          : null
      const updated = await outboxRepo.markRetry(entry.id, {
        attempts: attempt,
        lastError: err.message,
        nextRetryAt
      })
      if (attempt >= MAX_ATTEMPTS) {
        logger.warn(`(REDSTONE/LMS) Webhook ${entry.event} échec définitif (${entry.id})`)
      }
      return updated
    }
  }

  const processPending = async (limit = 20) => {
    const pending = await outboxRepo.listPending(limit)
    for (const entry of pending) {
      await processEntry(entry)
    }
    return pending.length
  }

  const emit = (event, payload) => {
    if (!isKnownEvent(event)) {
      logger.warn(`(REDSTONE/LMS) Webhook événement inconnu ignoré: ${event}`)
      return Promise.resolve(null)
    }
    const id = crypto.randomUUID()
    return outboxRepo
      .enqueue({ id, event, payload })
      .then(entry => {
        setImmediate(() => {
          processEntry(entry).catch(err => {
            logger.error(`(REDSTONE/LMS) Webhook process crash ${id}: ${err.message}`)
          })
        })
        return entry
      })
  }

  return {
    emit,
    deliver: deliverHttp,
    processEntry,
    processPending,
    signPayload
  }
}

module.exports = {
  createWebhooksService,
  createHttpTransport,
  signPayload,
  RETRY_DELAYS_MS
}
