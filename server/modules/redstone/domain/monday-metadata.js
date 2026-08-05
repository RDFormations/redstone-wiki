const { MONDAY_COLUMNS } = require('./monday-columns')

const columnMap = columnValues => {
  const map = {}
  ;(columnValues || []).forEach(col => {
    if (col?.id) map[col.id] = col
  })
  return map
}

const colText = (cols, id) => (cols[id]?.text || '').trim()

const parseTimeline = col => {
  if (!col) return { starts_at: null, ends_at: null, planning: [] }
  let from = null
  let to = null
  try {
    const parsed = JSON.parse(col.value || '{}')
    from = parsed.from || null
    to = parsed.to || null
  } catch {
    const text = (col.text || '').trim()
    if (text.includes(' - ')) {
      const parts = text.split(' - ')
      from = parts[0]?.trim() || null
      to = parts[1]?.trim() || null
    }
  }
  const planning = from && to ? [{ day: 1, date: from, modules: [] }] : []
  return { starts_at: from, ends_at: to, planning }
}

const parseLinkUrl = col => {
  if (!col?.value) return null
  try {
    const parsed = JSON.parse(col.value)
    return parsed.url || parsed.link || null
  } catch {
    return (col.text || '').trim() || null
  }
}

/**
 * Mappe un item Monday Missions V2 → patch session API.
 */
const mapMondayItemToSessionPatch = item => {
  const cols = columnMap(item.column_values)
  const timeline = parseTimeline(cols[MONDAY_COLUMNS.timeline])
  const teams = parseLinkUrl(cols[MONDAY_COLUMNS.teams])

  const metadata = {
    monday: {
      item_id: item.id,
      name: item.name,
      etat: colText(cols, MONDAY_COLUMNS.etat),
      formateur: colText(cols, MONDAY_COLUMNS.formateur),
      notes: colText(cols, MONDAY_COLUMNS.notes),
      synced_at: new Date().toISOString()
    },
    links: teams ? { teams } : undefined,
    planning: timeline.planning.length ? timeline.planning : undefined
  }

  return {
    title: (item.name || '').trim() || undefined,
    client: colText(cols, MONDAY_COLUMNS.client) || undefined,
    ref_client: colText(cols, MONDAY_COLUMNS.ref_client) || null,
    starts_at: timeline.starts_at,
    ends_at: timeline.ends_at,
    metadata
  }
}

const mergeSessionMetadata = (existing = {}, incoming = {}) => {
  const links = { ...(existing.links || {}), ...(incoming.links || {}) }
  const monday = { ...(existing.monday || {}), ...(incoming.monday || {}) }
  return {
    ...existing,
    ...incoming,
    links: Object.keys(links).length ? links : existing.links,
    monday: Object.keys(monday).length ? monday : existing.monday,
    planning: incoming.planning || existing.planning
  }
}

module.exports = {
  columnMap,
  parseTimeline,
  parseLinkUrl,
  mapMondayItemToSessionPatch,
  mergeSessionMetadata,
  MONDAY_COLUMNS
}
