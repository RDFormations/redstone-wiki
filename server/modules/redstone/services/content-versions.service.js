const { sessionNotFound } = require('../domain/api-result')

const normalizePath = path => {
  const p = String(path || '').trim()
  return p.endsWith('.md') ? p : `${p}.md`
}

const createContentVersionsService = ({ sessionRepo, contentRepo }) => ({
  async listForModule(sessionId, rawPath) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()

    const path = normalizePath(rawPath)
    const mod = await contentRepo.findBySessionAndPath(sessionId, path)
    if (!mod) {
      return {
        ok: false,
        status: 404,
        error: { code: 'module_not_found', message: `Module introuvable : ${path}` }
      }
    }

    const versions = await contentRepo.listVersions(mod.id)
    return {
      ok: true,
      status: 200,
      path: mod.path,
      module_id: mod.id,
      current_version: mod.current_version,
      versions
    }
  },

  async getVersion(sessionId, versionId) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()

    const version = await contentRepo.findVersion(versionId)
    if (!version) {
      return {
        ok: false,
        status: 404,
        error: { code: 'version_not_found', message: 'Version introuvable.' }
      }
    }

    const modules = await contentRepo.listBySession(sessionId)
    const owner = modules.find(m => m.id === version.module_id)
    if (!owner) {
      return {
        ok: false,
        status: 404,
        error: { code: 'version_not_found', message: 'Version hors session.' }
      }
    }

    return {
      ok: true,
      status: 200,
      path: owner.path,
      version
    }
  }
})

module.exports = { createContentVersionsService, normalizePath }
