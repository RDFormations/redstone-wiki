const { sessionNotFound } = require('../domain/api-result')
const { diffLines, summarizeDiff } = require('../domain/text-diff')

const normalizePath = path => {
  const p = String(path || '').trim()
  return p.endsWith('.md') ? p.slice(0, -3) : p
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
  },

  async compareVersions(sessionId, versionId, baseVersionId = null) {
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

    let baseBody = ''
    if (baseVersionId) {
      const base = await contentRepo.findVersion(baseVersionId)
      if (!base || base.module_id !== version.module_id) {
        return {
          ok: false,
          status: 404,
          error: { code: 'base_version_not_found', message: 'Version de référence introuvable.' }
        }
      }
      baseBody = base.body_md || ''
    } else if (version.version > 1) {
      const all = await contentRepo.listVersions(owner.id)
      const prev = all.find(v => v.version === version.version - 1)
      if (prev) {
        const prevFull = await contentRepo.findVersion(prev.id)
        baseBody = prevFull?.body_md || ''
      }
    }

    const hunks = diffLines(baseBody, version.body_md || '')
    return {
      ok: true,
      status: 200,
      path: owner.path,
      version,
      base_version: baseVersionId || (version.version > 1 ? version.version - 1 : null),
      diff: hunks,
      summary: summarizeDiff(hunks)
    }
  }
})

module.exports = { createContentVersionsService, normalizePath }
