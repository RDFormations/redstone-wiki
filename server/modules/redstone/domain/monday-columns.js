/** Colonnes Missions V2 — aligné sur CursorRDF rdf-monday-missions/constants.py */
const MONDAY_COLUMNS = {
  client: 'dropdown_mm50m6bp',
  formateur: 'dropdown_mm50kj4g',
  timeline: 'timerange_mm50rjgk',
  ref_client: 'text_mm50zqdd',
  etat: 'color_mm502yqg',
  teams: 'link_mm50j8dk',
  portail_formation: 'link_mm503wz6',
  notes: 'long_text_mm50dyvt',
  /** M03 — colonnes LMS (IDs via env, optionnels jusqu'à provision board) */
  portal_status: process.env.MONDAY_LMS_COL_PORTAL_STATUS || '',
  support_ready: process.env.MONDAY_LMS_COL_SUPPORT_READY || '',
  session_state: process.env.MONDAY_LMS_COL_SESSION_STATE || '',
  last_sync: process.env.MONDAY_LMS_COL_LAST_SYNC || '',
  error_detail: process.env.MONDAY_LMS_COL_ERROR_DETAIL || ''
}

const LMS_PUSH_COLUMNS = [
  'portal_status',
  'support_ready',
  'session_state',
  'last_sync',
  'error_detail'
]

module.exports = { MONDAY_COLUMNS, LMS_PUSH_COLUMNS }
