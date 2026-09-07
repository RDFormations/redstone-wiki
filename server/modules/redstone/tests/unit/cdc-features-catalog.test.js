const fs = require('fs')
const path = require('path')
const { CDC_VALIDATED_FEATURES, WIKI_ROOT } = require('../../domain/cdc-features-registry')

const unitDir = path.join(WIKI_ROOT, 'server/modules/redstone/tests/unit')
const e2eDir = path.join(WIKI_ROOT, 'server/modules/redstone/tests/e2e')

const testExists = name =>
  fs.existsSync(path.join(unitDir, name)) || fs.existsSync(path.join(e2eDir, name))

describe('CDC Validé — catalogue features (preuve + test)', () => {
  it('registre non vide (≥ 38 Validé)', () => {
    expect(CDC_VALIDATED_FEATURES.length).toBeGreaterThanOrEqual(38)
  })

  it.each(CDC_VALIDATED_FEATURES.map(f => [f.id, f]))(
    '%s — artefacts d’implémentation présents',
    (_id, f) => {
      expect(f.evidence.length).toBeGreaterThan(0)
      for (const rel of f.evidence) {
        const abs = path.join(WIKI_ROOT, rel)
        expect(fs.existsSync(abs)).toBe(true)
      }
    }
  )

  it.each(CDC_VALIDATED_FEATURES.map(f => [f.id, f]))(
    '%s — au moins un test dédié',
    (_id, f) => {
      expect(f.tests.length).toBeGreaterThan(0)
      const found = f.tests.filter(testExists)
      expect(found.length).toBeGreaterThan(0)
    }
  )
})
