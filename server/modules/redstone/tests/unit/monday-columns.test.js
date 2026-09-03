const { LMS_PUSH_COLUMNS } = require('../../domain/monday-columns')

describe('monday-columns M03', () => {
  const REQUIRED = [
    'portal_status',
    'support_ready',
    'session_state',
    'last_sync',
    'error_detail'
  ]

  it('expose les 5 colonnes LMS push', () => {
    expect(LMS_PUSH_COLUMNS).toEqual(REQUIRED)
  })

  it('lit les IDs depuis l’env (vides par défaut)', () => {
    jest.resetModules()
    const prev = { ...process.env }
    delete process.env.MONDAY_LMS_COL_PORTAL_STATUS
    delete process.env.MONDAY_LMS_COL_SUPPORT_READY
    const { MONDAY_COLUMNS } = require('../../domain/monday-columns')
    expect(MONDAY_COLUMNS.portal_status).toBe('')
    expect(MONDAY_COLUMNS.portail_formation).toMatch(/^link_/)
    Object.assign(process.env, prev)
  })

  it('accepte IDs provisionnés via env', () => {
    jest.resetModules()
    process.env.MONDAY_LMS_COL_PORTAL_STATUS = 'status_test_portal'
    process.env.MONDAY_LMS_COL_SUPPORT_READY = 'status_test_support'
    const { MONDAY_COLUMNS } = require('../../domain/monday-columns')
    expect(MONDAY_COLUMNS.portal_status).toBe('status_test_portal')
    expect(MONDAY_COLUMNS.support_ready).toBe('status_test_support')
    delete process.env.MONDAY_LMS_COL_PORTAL_STATUS
    delete process.env.MONDAY_LMS_COL_SUPPORT_READY
  })
})
