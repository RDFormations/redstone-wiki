const qr = require('qr-image')

/** SVG inline pour affichage QR (formateur / stagiaire hub). */
const qrSvgForUrl = url => {
  try {
    if (!url) return ''
    return qr.imageSync(String(url), { type: 'svg', margin: 1 })
  } catch {
    return ''
  }
}

module.exports = { qrSvgForUrl }
