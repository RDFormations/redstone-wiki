const { transition, messageFor } = require('../../domain/session-state')

describe('session-state transitions', () => {
  it('draft → draft_ready sur import QA verte', () => {
    expect(transition('draft', 'import_qa_green')).toBe('draft_ready')
  })

  it('draft_ready → distributed sur distribute OK', () => {
    expect(transition('draft_ready', 'distribute_ok')).toBe('distributed')
  })

  it('échec distribute → incomplete', () => {
    expect(transition('draft_ready', 'distribute_fail')).toBe('incomplete')
  })

  it('message métier stagiaire', () => {
    expect(messageFor('incomplete', 'stagiaire')).toContain('pas encore prêt')
  })
})
