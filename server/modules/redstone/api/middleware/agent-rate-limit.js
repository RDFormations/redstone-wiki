/**
 * O01 confort — rate limit in-memory pour API agents /api/v1 (hors /public).
 * Fenêtre glissante par IP + token role.
 */
const createAgentRateLimit = (options = {}) => {
  const windowMs = Number(options.windowMs || process.env.REDSTONE_LMS_RATE_WINDOW_MS || 60_000)
  const max = Number(options.max || process.env.REDSTONE_LMS_RATE_MAX || 120)
  const buckets = new Map()

  const keyFor = req => {
    const role = req.redstoneAuth?.role || 'anon'
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'
    return `${role}:${ip}`
  }

  const prune = (now) => {
    for (const [k, b] of buckets) {
      if (now - b.start >= windowMs) buckets.delete(k)
    }
  }

  return (req, res, next) => {
    const now = Date.now()
    if (buckets.size > 5000) prune(now)
    const key = keyFor(req)
    let bucket = buckets.get(key)
    if (!bucket || now - bucket.start >= windowMs) {
      bucket = { start: now, count: 0 }
      buckets.set(key, bucket)
    }
    bucket.count += 1
    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)))
    if (bucket.count > max) {
      return res.status(429).json({
        error: {
          code: 'rate_limited',
          message: `Trop de requêtes (max ${max}/${Math.round(windowMs / 1000)}s).`
        }
      })
    }
    return next()
  }
}

module.exports = { createAgentRateLimit }
