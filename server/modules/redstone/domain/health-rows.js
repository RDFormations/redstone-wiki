const crypto = require('crypto')

const toHealthRows = checks =>
  (checks || []).map(check => ({
    id: crypto.randomUUID(),
    ...check
  }))

module.exports = { toHealthRows }
