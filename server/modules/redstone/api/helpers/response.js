/** Helpers HTTP routers LMS — mapping résultat → Express response. */

const sendSession = (res, result) => {
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error })
  }
  return res.status(result.status).json(result.session ? { session: result.session } : result)
}

const sendResult = (res, result, { okStatus = 200 } = {}) => {
  if (!result.ok) {
    const body = result.error ? { error: result.error } : result
    return res.status(result.status).json(body)
  }
  const { ok: _ok, status: _status, error: _error, ...payload } = result
  return res.status(result.status || okStatus).json({ ok: true, ...payload })
}

module.exports = { sendSession, sendResult }
