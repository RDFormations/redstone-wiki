const express = require('express')
const { createAuthMiddleware } = require('../modules/redstone/api/middleware/auth-scopes')
const { createSessionsRouter } = require('../modules/redstone/api/v1/sessions.router')

/* global WIKI */

const router = express.Router()

router.use(createAuthMiddleware())
router.use('/sessions', createSessionsRouter(() => WIKI.redstone.sessions))

module.exports = router
