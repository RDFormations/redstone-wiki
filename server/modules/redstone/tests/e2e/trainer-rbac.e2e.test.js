/**
 * E2E — T02 RBAC formateurs-{slug} provisionné à distribute.
 */
const { describeE2e } = require('./helpers/e2e-suite')
const { api, tokens } = require('./helpers/lms-client')
const { wikiLogin, gql, adminCreds } = require('./helpers/wiki-client')
const { provisionDistributedSession } = require('./helpers/session-factory')
const { trainerGroupName, trainerRulePath } = require('../../domain/trainer-access')

describeE2e('LMS — T02 RBAC formateurs-{slug}', () => {
  it('distribute crée le groupe scoped formateurs-{slug}', async () => {
    const slug = `e2e-t02-${Date.now()}`
    const provisioned = await provisionDistributedSession({
      prefix: slug,
      slug,
      trainerEmail: adminCreds().email
    })

    expect(provisioned.distribute.trainer_access).toBeDefined()
    expect(provisioned.distribute.trainer_access.ok).toBe(true)
    expect(provisioned.distribute.trainer_access.group_name).toBe(trainerGroupName(slug))
    expect(provisioned.distribute.trainer_access.created).toBe(true)

    const assignment = provisioned.distribute.trainer_access.assignment
    expect(assignment.ok).toBe(true)
    expect(assignment.email).toBe(adminCreds().email.toLowerCase())
    expect(assignment.assigned).toBe(true)
  }, 120000)

  it('deux sessions → deux groupes distincts', async () => {
    const a = await provisionDistributedSession({ prefix: 'e2e-t02-a' })
    const b = await provisionDistributedSession({ prefix: 'e2e-t02-b' })

    expect(a.distribute.trainer_access.group_name).toBe(trainerGroupName(a.slug))
    expect(b.distribute.trainer_access.group_name).toBe(trainerGroupName(b.slug))
    expect(a.distribute.trainer_access.group_id).not.toBe(b.distribute.trainer_access.group_id)
  }, 180000)

  it('groupe Wiki.js a une règle START sur formations/{slug} uniquement', async () => {
    const slug = `e2e-t02-rule-${Date.now()}`
    const provisioned = await provisionDistributedSession({ prefix: slug, slug })
    const groupId = provisioned.distribute.trainer_access.group_id
    expect(groupId).toBeTruthy()

    const jwt = await wikiLogin()
    const data = await gql(
      `query($id:Int!){groups{single(id:$id){id name redirectOnLogin pageRules{path match deny roles}}}}`,
      { id: groupId },
      jwt
    )
    const group = data.groups.single
    expect(group.name).toBe(trainerGroupName(slug))
    expect(group.redirectOnLogin).toContain(`/formations/${slug}/formateur`)
    expect(group.pageRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: trainerRulePath(slug),
          match: 'START',
          deny: false
        })
      ])
    )
    expect(group.pageRules[0].roles).toContain('write:pages')
  }, 120000)

  it('re-distribute idempotent (groupe existant, pas de doublon)', async () => {
    const slug = `e2e-t02-idem-${Date.now()}`
    const first = await provisionDistributedSession({ prefix: slug, slug })
    const groupId = first.distribute.trainer_access.group_id

    const second = await api('POST', `/sessions/${first.sessionId}/distribute`, {
      token: tokens().agent,
      body: {}
    })
    expect(second.status).toBe(200)
    expect(second.body.trainer_access.group_id).toBe(groupId)
    expect(second.body.trainer_access.created).toBe(false)
  }, 120000)

  it('sans email formateur → groupe créé, assignment skipped', async () => {
    const slug = `e2e-t02-noemail-${Date.now()}`
    const provisioned = await provisionDistributedSession({ prefix: slug, slug })
    expect(provisioned.distribute.trainer_access.ok).toBe(true)
    expect(provisioned.distribute.trainer_access.assignment.skipped).toBe(true)
    expect(provisioned.distribute.trainer_access.assignment.reason).toBe('no_trainer_email')
  }, 120000)
})
