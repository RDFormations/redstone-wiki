const { describeE2e } = require('./helpers/e2e-suite')
const { pingSite } = require('./helpers/lms-client')

describeE2e('LMS — E01 assets serveur', () => {
  it('bloque /_assets/formateur/ pour invité', async () => {
    const res = await pingSite('/_assets/formateur/quiris-admin-m365.json')
    expect(res.status).toBe(403)
    expect(res.body?.error?.code).toBe('asset_forbidden')
  })

  it('bloque /_assets/nav/ brouillon pour invité', async () => {
    const res = await pingSite('/_assets/nav/quiris-admin-m365.json')
    expect(res.status).toBe(403)
  })

  it('autorise /_assets/nav/*-published.json pour invité', async () => {
    const res = await pingSite('/_assets/nav/quiris-admin-m365-published.json')
    expect(res.status).toBe(200)
  })

  it('laisse passer les assets publics génériques', async () => {
    const res = await pingSite('/_assets/svg/icon-file.svg')
    expect(res.status).toBe(200)
  })
})
