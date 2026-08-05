/** Gestion centralisée des erreurs API LMS — messages FR métier. */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }

  const status = err.status || err.statusCode || 500
  const code = err.code || 'internal_error'
  const message =
    err.message ||
    (status === 500
      ? 'Erreur interne du serveur LMS.'
      : 'Requête invalide.')

  if (status >= 500) {
    // eslint-disable-next-line no-console
    ;(req.log || console).error?.(`(REDSTONE/LMS) ${req.method} ${req.path}: ${message}`)
  }

  return res.status(status).json({
    error: {
      code,
      message
    }
  })
}

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = { errorHandler, asyncHandler }
