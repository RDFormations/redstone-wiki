const http = require('http')
const { postJson } = require('../../infrastructure/http-json-client')

describe('http-json-client', () => {
  let server
  let port

  beforeAll(done => {
    server = http.createServer((req, res) => {
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, echo: JSON.parse(body) }))
      })
    })
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port
      done()
    })
  })

  afterAll(done => {
    server.close(done)
  })

  it('poste du JSON sans fetch', async () => {
    const res = await postJson(`http://127.0.0.1:${port}/test`, {
      body: { hello: 'world' }
    })
    expect(res.status).toBe(200)
    expect(JSON.parse(res.body).echo.hello).toBe('world')
  })

  it('rejette une URL invalide', async () => {
    await expect(postJson('not-a-url', { body: {} })).rejects.toThrow(/URL chatbot invalide/)
  })
})
