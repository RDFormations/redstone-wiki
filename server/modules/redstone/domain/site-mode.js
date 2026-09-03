/**
 * F07 — mode instance « Formation » (admin simplifié).
 */
const isFormationMode = (env = process.env) =>
  String(env.REDSTONE_SITE_MODE || '').trim().toLowerCase() === 'formation'

module.exports = { isFormationMode }
