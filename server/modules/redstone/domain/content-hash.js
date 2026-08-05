const crypto = require('crypto')

const hashContent = (bodyMd, frontmatter = {}) => {
  const payload = JSON.stringify({
    body: bodyMd || '',
    frontmatter: frontmatter || {}
  })
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex')
}

module.exports = { hashContent }
