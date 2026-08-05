/**
 * Parse YAML frontmatter from Markdown body
 */
const parseFrontmatter = text => {
  const raw = typeof text === 'string' ? text : ''
  if (!raw.startsWith('---')) {
    return { frontmatter: {}, body: raw }
  }
  const parts = raw.split('---')
  if (parts.length < 3) {
    return { frontmatter: {}, body: raw }
  }
  const yamlBlock = parts[1]
  const body = parts.slice(2).join('---').replace(/^\n/, '')
  const frontmatter = {}
  yamlBlock.split('\n').forEach(line => {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!m) return
    let val = m[2].trim()
    if (val === 'true') val = true
    else if (val === 'false') val = false
    else if (/^\d+$/.test(val)) val = Number(val)
    else val = val.replace(/^["']|["']$/g, '')
    frontmatter[m[1]] = val
  })
  return { frontmatter, body }
}

module.exports = { parseFrontmatter }
