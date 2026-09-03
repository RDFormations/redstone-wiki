const fs = require('fs')
const path = require('path')
const { sessionNotFound, fail } = require('../domain/api-result')

/**
 * C03′ — export async vers dossier RDF-formations (pas tuyau prod).
 */
const createExportGitService = ({
  sessionRepo,
  contentRepo,
  getExportRoot = () =>
    process.env.RDF_FORMATIONS_ROOT ||
    process.env.REDSTONE_EXPORT_GIT_ROOT ||
    null,
  logger = console
}) => ({
  async exportSession(sessionId, options = {}) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()

    const root = options.root || getExportRoot()
    if (!root) {
      return fail(
        503,
        'export_root_missing',
        'RDF_FORMATIONS_ROOT ou REDSTONE_EXPORT_GIT_ROOT requis.'
      )
    }

    const locale = session.locale_default || 'fr'
    const destDir = path.join(root, 'formations', session.slug, 'cours', locale)
    fs.mkdirSync(destDir, { recursive: true })

    const modules = await contentRepo.listBySession(sessionId)
    const written = []
    for (const mod of modules) {
      if (mod.kind === 'hub') continue
      const filename = mod.path.endsWith('.md') ? mod.path : `${mod.path}.md`
      const filePath = path.join(destDir, filename)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, mod.body_md || '', 'utf8')
      written.push(path.relative(root, filePath))
    }

    logger.info(`(REDSTONE/LMS) Export git ${session.slug}: ${written.length} fichier(s) → ${destDir}`)
    return {
      ok: true,
      status: 200,
      slug: session.slug,
      root,
      dest: destDir,
      files: written,
      trigger: options.trigger || 'manual'
    }
  }
})

module.exports = { createExportGitService }
