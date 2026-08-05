const { createNavService } = require('../../services/nav.service')

describe('nav.service', () => {
  const session = { slug: 'test-slug', locale_default: 'fr' }
  const modules = [
    { path: '00-introduction', kind: 'intro', title: 'Intro', published_stagiaire: true, body_md: '' },
    { path: 'module-01-a', kind: 'module', title: 'M1', published_stagiaire: true, body_md: '' },
    { path: 'module-02-b', kind: 'module', title: 'M2', published_stagiaire: false, body_md: '' }
  ]

  it('stagiaire ne voit que publiés', () => {
    const nav = createNavService().getNav(session, modules, 'stagiaire')
    expect(nav.items.some(i => i.path === 'module-02-b')).toBe(false)
    expect(nav.items.some(i => i.path === 'module-01-a')).toBe(true)
  })

  it('formateur voit tout', () => {
    const nav = createNavService().getNav(session, modules, 'formateur')
    expect(nav.items.length).toBe(3)
  })

  it('progression modules', () => {
    const nav = createNavService().getNav(session, modules, 'stagiaire')
    expect(nav.progress.published_modules).toBe(1)
  })
})
