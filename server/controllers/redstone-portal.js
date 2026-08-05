const { createFormationGuestRedirect } = require('../modules/redstone/api/middleware/formation-guest-redirect')

/* global WIKI */

module.exports = createFormationGuestRedirect(async slug => {
  if (!WIKI.redstone?.portal) return false
  const result = await WIKI.redstone.portal.getSessionBySlug(slug)
  return Boolean(result.ok)
})
