const { pingSite } = require('./lms-client')

/** Codes HTTP acceptables pour une page Wiki (existe vs introuvable vs interdit). */
const SITE = {
  NOT_FOUND: [404],
  FORBIDDEN: [403],
  OK: [200],
  EXISTS: [200, 302, 403],
  UNKNOWN: [403, 404],
  REDIRECT: [301, 302, 307, 308]
}

const expectSiteStatus = async (path, allowed, label = path) => {
  const res = await pingSite(path)
  expect(allowed).toContain(res.status)
  return res
}

const formationPath = (slug, stem = '') =>
  stem ? `/formations/${slug}/${stem}` : `/formations/${slug}`

module.exports = {
  SITE,
  expectSiteStatus,
  formationPath
}
