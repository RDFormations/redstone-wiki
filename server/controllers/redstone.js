const express = require('express')
const { createAuthMiddleware } = require('../modules/redstone/api/middleware/auth-scopes')
const { createAgentRateLimit } = require('../modules/redstone/api/middleware/agent-rate-limit')
const { errorHandler } = require('../modules/redstone/api/middleware/error-handler')
const { createSessionsRouter } = require('../modules/redstone/api/v1/sessions.router')
const { createContentRouter } = require('../modules/redstone/api/v1/content.router')
const { createPublicRouter } = require('../modules/redstone/api/v1/public.router')

/* global WIKI */

const router = express.Router()

router.use('/public', createPublicRouter(() => WIKI.redstone))
router.use(createAgentRateLimit())
router.use(createAuthMiddleware())
router.use('/sessions', createSessionsRouter(() => WIKI.redstone))
router.use('/sessions', createContentRouter(() => WIKI.redstone))
router.use(errorHandler)

module.exports = router
