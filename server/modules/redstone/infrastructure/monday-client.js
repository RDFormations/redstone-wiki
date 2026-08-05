const https = require('https')

const API_URL = 'https://api.monday.com/v2'

const postGraphql = (token, queryStr, variables = {}) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: queryStr, variables })
    const req = https.request(
      API_URL,
      {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 60000
      },
      res => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => {
          try {
            const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            if (parsed.errors?.length) {
              reject(new Error(`Monday GraphQL: ${JSON.stringify(parsed.errors)}`))
              return
            }
            resolve(parsed.data || {})
          } catch (err) {
            reject(err)
          }
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('Monday API timeout')))
    req.write(body)
    req.end()
  })

const fetchMissionItem = async (itemId, token) => {
  const data = await postGraphql(
    token,
    `query ($id: [ID!]) {
      items(ids: $id) {
        id
        name
        column_values { id text value }
      }
    }`,
    { id: [String(itemId)] }
  )
  const items = data.items || []
  if (!items.length) {
    throw new Error(`Monday item introuvable: ${itemId}`)
  }
  return items[0]
}

module.exports = { postGraphql, fetchMissionItem }
