/** Réponses API LMS — formes stables pour routers et services. */

const sessionNotFound = (message = 'Session introuvable.') => ({
  ok: false,
  status: 404,
  error: { code: 'session_not_found', message }
})

const fail = (status, code, message, extra = {}) => ({
  ok: false,
  status,
  error: { code, message },
  ...extra
})

const ok = (status, body = {}) => ({
  ok: true,
  status,
  ...body
})

module.exports = { sessionNotFound, fail, ok }
