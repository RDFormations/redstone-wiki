const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../../../../../')

describe('upgrade-process F12', () => {
  it('UPGRADE.md documente le process CVE / merge upstream', () => {
    const md = fs.readFileSync(path.join(ROOT, 'UPGRADE.md'), 'utf8')
    expect(md.length).toBeGreaterThan(200)
    expect(md.toLowerCase()).toMatch(/cve|upstream|wiki\.js|merge|patch/)
  })

  it('dossier patches/ présent pour divergences fork', () => {
    const patches = path.join(ROOT, 'patches')
    expect(fs.existsSync(patches)).toBe(true)
  })
})
