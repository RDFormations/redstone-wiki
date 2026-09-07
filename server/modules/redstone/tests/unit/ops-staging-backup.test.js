const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../../../../../')

describe('ops staging + backup I01/I02', () => {
  it('I01 — docker-compose.staging.yml définit un overlay staging', () => {
    const yml = fs.readFileSync(path.join(ROOT, 'docker-compose.staging.yml'), 'utf8')
    expect(yml).toMatch(/NODE_ENV:\s*staging/)
    expect(yml).toMatch(/wiki-staging-db/)
  })

  it('I01 — doc opérations présente', () => {
    const doc = path.join(ROOT, 'docs/OPERATIONS-staging-backup.md')
    expect(fs.existsSync(doc)).toBe(true)
    expect(fs.readFileSync(doc, 'utf8').length).toBeGreaterThan(100)
  })

  it('I02 — scripts backup/restore exécutables et documentés', () => {
    for (const rel of ['scripts/backup-pg.sh', 'scripts/restore-pg.sh']) {
      const abs = path.join(ROOT, rel)
      expect(fs.existsSync(abs)).toBe(true)
      const body = fs.readFileSync(abs, 'utf8')
      expect(body).toMatch(/pg_dump|pg_restore|gunzip|gzip/)
      const mode = fs.statSync(abs).mode
      // au moins user-executable
      expect(mode & 0o100).toBeTruthy()
    }
  })
})
