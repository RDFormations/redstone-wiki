const { wikiPagePath } = require('./publish-policy')

const stemFromModulePath = path => String(path || '').replace(/\.md$/, '')

const navItemToBundleItem = (session, item) => {
  const stem = stemFromModulePath(item.path)
  const wikiPath = wikiPagePath(session.slug, stem)
  return {
    path: wikiPath,
    href: item.href,
    title: item.title,
    isPublished: Boolean(item.published)
  }
}

/** Format nav bundle (sidebar + assets legacy) depuis nav.service output. */
const buildNavBundle = (session, nav) => ({
  slug: session.slug,
  lang: session.locale_default || 'fr',
  base_slug: session.slug,
  title: session.title,
  wiki_path: session.wiki_path || `/formations/${session.slug}`,
  audience: nav.audience,
  progress: nav.progress,
  items: (nav.items || []).map(item => navItemToBundleItem(session, item))
})

module.exports = {
  buildNavBundle,
  navItemToBundleItem,
  stemFromModulePath
}
