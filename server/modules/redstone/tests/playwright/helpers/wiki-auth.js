const { wikiLogin } = require('../../e2e/helpers/wiki-client')
const { siteUrl } = require('../../e2e/helpers/lms-client')

/** Injecte le cookie JWT Wiki.js (admin local / CI) dans un contexte Playwright. */
const injectWikiJwt = async context => {
  const jwt = await wikiLogin()
  await context.addCookies([
    {
      name: 'jwt',
      value: jwt,
      url: siteUrl()
    }
  ])
  return jwt
}

module.exports = { injectWikiJwt }
