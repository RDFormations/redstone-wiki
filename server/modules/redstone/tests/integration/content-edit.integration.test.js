/**
 * Intégration C12/C14 — flux complet édition → versions → diff via API LMS.
 */
const { describeE2e } = require('../e2e/helpers/e2e-suite')
const { tokens } = require('../e2e/helpers/lms-client')
const {
  provisionDistributedSession,
  getModule,
  editModule,
  listVersions,
  diffVersion
} = require('../e2e/helpers/session-factory')

describeE2e('LMS integration — C12/C14 content edit pipeline', () => {
  it('enchaîne import → distribute → edit → versions → diff', async () => {
    const { sessionId } = await provisionDistributedSession({ prefix: 'e2e-integ-edit' })
    const path = 'module-01-e2e'

    const initial = await getModule(sessionId, path, tokens().formateur)
    expect(initial.status).toBe(200)
    const v1 = initial.body.current_version

    const marker1 = `integration-edit-1-${Date.now()}`
    const edit1 = await editModule(
      sessionId,
      path,
      `${initial.body.body_md}\n\n${marker1}`,
      tokens().formateur
    )
    expect(edit1.status).toBe(200)
    expect(edit1.body.version).toBe(v1 + 1)

    const marker2 = `integration-edit-2-${Date.now()}`
    const edit2 = await editModule(
      sessionId,
      path,
      `${initial.body.body_md}\n\n${marker1}\n\n${marker2}`,
      tokens().ops
    )
    expect(edit2.status).toBe(200)
    expect(edit2.body.version).toBe(v1 + 2)

    const versions = await listVersions(sessionId, path, tokens().formateur)
    expect(versions.status).toBe(200)
    expect(versions.body.versions.length).toBeGreaterThanOrEqual(3)
    expect(versions.body.versions.filter(v => v.source === 'ui_edit').length).toBeGreaterThanOrEqual(2)

    const latest = versions.body.versions[0]
    const diff = await diffVersion(sessionId, latest.id, tokens().formateur)
    expect(diff.status).toBe(200)
    expect(diff.body.summary.added).toBeGreaterThan(0)

    const final = await getModule(sessionId, path)
    expect(final.body.body_md).toContain(marker2)
    expect(final.body.current_version).toBe(v1 + 2)
  }, 120000)
})
