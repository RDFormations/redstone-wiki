const https = require('https')

const API_URL = 'https://api.monday.com/v2'
const DEFAULT_BOARD_ID = process.env.MONDAY_MISSIONS_BOARD_ID || '18420737449'

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

const changeColumnValue = async (token, { boardId, itemId, columnId, value }) => {
  const data = await postGraphql(
    token,
    `mutation ($board: ID!, $item: ID!, $col: String!, $val: JSON!) {
      change_column_value(board_id: $board, item_id: $item, column_id: $col, value: $val) {
        id
      }
    }`,
    {
      board: String(boardId),
      item: String(itemId),
      col: columnId,
      val: JSON.stringify(value)
    }
  )
  if (!data.change_column_value) {
    throw new Error(`Monday change_column_value échec: ${columnId}`)
  }
  return data.change_column_value
}

const changeTextColumn = async (token, opts) =>
  changeColumnValue(token, { ...opts, value: String(opts.value ?? '') })

const changeStatusColumn = async (token, opts) =>
  changeColumnValue(token, { ...opts, value: { label: opts.value } })

const changeDateColumn = async (token, opts) =>
  changeColumnValue(token, { ...opts, value: { date: opts.value } })

const changeLinkColumn = async (token, opts) => {
  const url = String(opts.value || '')
  return changeColumnValue(token, {
    ...opts,
    columnId: opts.columnId,
    value: { url, text: url }
  })
}

module.exports = {
  API_URL,
  DEFAULT_BOARD_ID,
  postGraphql,
  fetchMissionItem,
  changeColumnValue,
  changeTextColumn,
  changeStatusColumn,
  changeDateColumn,
  changeLinkColumn
}
