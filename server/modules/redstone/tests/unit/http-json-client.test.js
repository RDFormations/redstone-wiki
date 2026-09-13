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

  it('transmet les headers Authorization', async () => {
    const received = []
    const server2 = http.createServer((req, res) => {
      received.push(req.headers.authorization)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}')
    })
    await new Promise((resolve, reject) => {
      server2.listen(0, '127.0.0.1', async () => {
        try {
          const p = server2.address().port
          await postJson(`http://127.0.0.1:${p}/auth`, {
            headers: { Authorization: 'Bearer test' },
            body: { x: 1 }
          })
          expect(received[0]).toBe('Bearer test')
          server2.close(resolve)
        } catch (e) {
          server2.close(() => reject(e))
        }
      })
    })
  })
})
