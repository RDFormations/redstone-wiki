const { mergeSessionMetadata } = require('./monday-metadata')

const ALLOWED_PATCH_KEYS = new Set([
  'title',
  'client',
  'ref_client',
  'starts_at',
  'ends_at',
  'metadata'
])

/**
 * Valide un patch manuel POST /sync-monday (override sans appel Monday API).
 */
const validateMondaySyncPatch = body => {
  const input = body && typeof body === 'object' ? body : {}
  const unknown = Object.keys(input).filter(k => !ALLOWED_PATCH_KEYS.has(k))
  if (unknown.length) {
    return {
      ok: false,
      code: 'invalid_sync_fields',
      message: `Champs non autorisés : ${unknown.join(', ')}`
    }
  }

  const patch = {}
  if (input.title !== undefined) {
    const title = String(input.title).trim()
    if (!title) {
      return { ok: false, code: 'title_required', message: 'Le titre ne peut pas être vide.' }
    }
    patch.title = title
  }
  if (input.client !== undefined) {
    const client = String(input.client).trim()
    if (!client) {
      return { ok: false, code: 'client_required', message: 'Le client ne peut pas être vide.' }
    }
    patch.client = client
  }
  if (input.ref_client !== undefined) {
    patch.ref_client = input.ref_client == null ? null : String(input.ref_client).trim() || null
  }
  if (input.starts_at !== undefined) patch.starts_at = input.starts_at || null
  if (input.ends_at !== undefined) patch.ends_at = input.ends_at || null
  if (input.metadata !== undefined) {
    if (!input.metadata || typeof input.metadata !== 'object' || Array.isArray(input.metadata)) {
      return { ok: false, code: 'metadata_invalid', message: 'metadata doit être un objet JSON.' }
    }
    patch.metadata = input.metadata
  }

  return { ok: true, value: patch }
}

const applyMetadataMerge = (session, patch) => {
  if (!patch.metadata) return patch
  return {
    ...patch,
    metadata: mergeSessionMetadata(session.metadata || {}, patch.metadata)
  }
}

module.exports = {
  ALLOWED_PATCH_KEYS,
  validateMondaySyncPatch,
  applyMetadataMerge
}
