const { INITIAL_STATE } = require('./session-state')

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/

const SLUG_ERRORS = {
  required: 'Le slug est obligatoire.',
  format: 'Slug invalide : minuscules, chiffres et tirets uniquement (2–128 caractères).',
  immutable: 'Le slug ne peut pas être modifié après création.'
}

const FIELD_ERRORS = {
  monday_item_id: 'monday_item_id est obligatoire et doit être un entier positif.',
  client: 'Le client est obligatoire.',
  title: 'Le titre de la formation est obligatoire.'
}

const normalizeSlug = raw => (typeof raw === 'string' ? raw.trim().toLowerCase() : '')

const validateSlug = slug => {
  const normalized = normalizeSlug(slug)
  if (!normalized) {
    return { ok: false, code: 'slug_required', message: SLUG_ERRORS.required }
  }
  if (normalized.length < 2) {
    return { ok: false, code: 'slug_invalid', message: SLUG_ERRORS.format }
  }
  if (!SLUG_PATTERN.test(normalized)) {
    return { ok: false, code: 'slug_invalid', message: SLUG_ERRORS.format }
  }
  return { ok: true, value: normalized }
}

const parseMondayItemId = raw => {
  const id = Number.parseInt(raw, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, code: 'monday_item_id_invalid', message: FIELD_ERRORS.monday_item_id }
  }
  return { ok: true, value: id }
}

const requireString = (value, field, message) => {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) {
    return { ok: false, code: `${field}_required`, message }
  }
  return { ok: true, value: trimmed }
}

/**
 * Valide le payload POST /sessions
 * @returns {{ ok: true, value: object } | { ok: false, code: string, message: string }}
 */
const validateCreatePayload = body => {
  const input = body || {}

  const slugResult = validateSlug(input.slug)
  if (!slugResult.ok) {
    return slugResult
  }

  const mondayResult = parseMondayItemId(input.monday_item_id)
  if (!mondayResult.ok) {
    return mondayResult
  }

  const clientResult = requireString(input.client, 'client', FIELD_ERRORS.client)
  if (!clientResult.ok) {
    return clientResult
  }

  const titleResult = requireString(input.title, 'title', FIELD_ERRORS.title)
  if (!titleResult.ok) {
    return titleResult
  }

  const locale = typeof input.locale_default === 'string' && input.locale_default.trim()
    ? input.locale_default.trim().toLowerCase()
    : 'fr'

  return {
    ok: true,
    value: {
      slug: slugResult.value,
      mondayItemId: mondayResult.value,
      client: clientResult.value,
      refClient: typeof input.ref_client === 'string' ? input.ref_client.trim() || null : null,
      title: titleResult.value,
      localeDefault: locale,
      state: INITIAL_STATE,
      startsAt: input.starts_at || null,
      endsAt: input.ends_at || null,
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
    }
  }
}

const buildWikiPath = slug => `/formations/${slug}`

module.exports = {
  SLUG_ERRORS,
  SLUG_PATTERN,
  normalizeSlug,
  validateSlug,
  validateCreatePayload,
  buildWikiPath
}
