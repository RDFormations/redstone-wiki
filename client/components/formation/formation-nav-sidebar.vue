<template lang="pug">
  .rs-sidebar
    a.rs-sidebar-stagiaire-cta(
      v-if='stagiaireHref'
      :href='stagiaireHref'
      :class='{ "rs-sidebar-stagiaire-cta--active": isStagiaireActive }'
      @click='onNavigate'
      )
      v-icon.mr-2(small) mdi-link-variant
      | Liens session
    p.rs-sidebar-loading(v-if='navLoading && !items.length') Chargement du menu…
    p.rs-sidebar-error(v-else-if='navError') Menu indisponible — réessayez dans un instant.
    a.rs-sidebar-formateur-cta(
      v-if='canSeeUnpublished && formateurHref'
      :href='formateurHref'
      :class='{ "rs-sidebar-formateur-cta--active": isFormateurActive }'
      @click='onNavigate'
      )
      v-icon.mr-2(small) mdi-account-tie
      | Espace formateur
    .rs-sidebar-hero(v-if='heroTitle')
      .rs-sidebar-hero-badge Formation
      h2.rs-sidebar-hero-title {{ heroTitle }}
      p.rs-sidebar-hero-meta(v-if='moduleCount') {{ moduleCount }} modules · support autonome
    nav.rs-nav(v-if='hasNavContent', aria-label='Navigation formation')
      .rs-nav-group(v-for='group in groups', :key='group.id')
        .rs-nav-group-label
          span.rs-nav-group-icon {{ group.icon }}
          | {{ group.label }}
        ul.rs-nav-list.rs-nav-list--modules(v-if='group.id === "modules"')
          li.rs-nav-module-block(
            v-for='block in group.blocks'
            :key='blockKey(block)'
            )
            a.rs-nav-link(
              v-if='block.module && linkVisible(block.module)'
              :class='{ "rs-nav-link--active": isActive(block.module.href) }'
              :href='block.module.href'
              @click='onNavigate'
              )
              span.rs-nav-badge(v-if='block.badge') {{ block.badge }}
              span.rs-nav-link-text {{ block.module.shortTitle }}
            span.rs-nav-link.rs-nav-link--pending(
              v-else-if='block.module'
              :title='"Module bientôt disponible"'
              )
              span.rs-nav-badge(v-if='block.badge') {{ block.badge }}
              span.rs-nav-link-text {{ block.module.shortTitle }}
            .rs-nav-practice(
              v-if='block.practice'
              :aria-label='practiceAriaLabel(block)'
              )
              a.rs-nav-practice-link(
                v-if='block.practice.exercice && linkVisible(block.practice.exercice)'
                :class='practiceLinkClass(block.practice.exercice)'
                :href='block.practice.exercice.href'
                :title='block.practice.exercice.title'
                @click='onNavigate'
                )
                span.rs-nav-practice-tag Exercice
                span.rs-nav-practice-text {{ block.practice.exercice.shortTitle }}
              a.rs-nav-practice-link(
                v-if='block.practice.correction && linkVisible(block.practice.correction)'
                :class='practiceLinkClass(block.practice.correction)'
                :href='block.practice.correction.href'
                :title='block.practice.correction.title'
                @click='onNavigate'
                )
                span.rs-nav-practice-tag Correction
                span.rs-nav-practice-text {{ block.practice.correction.shortTitle }}
        ul.rs-nav-list(v-else)
          li(v-for='item in group.items', :key='item.path')
            a.rs-nav-link(
              v-if='linkVisible(item)'
              :class='{ "rs-nav-link--active": isActive(item.href) }'
              :href='item.href'
              @click='onNavigate'
              )
              span.rs-nav-badge(v-if='item.badge') {{ item.badge }}
              span.rs-nav-link-text {{ item.shortTitle }}
            span.rs-nav-link.rs-nav-link--pending(
              v-else
              :title='"Page bientôt disponible"'
              )
              span.rs-nav-badge(v-if='item.badge') {{ item.badge }}
              span.rs-nav-link-text {{ item.shortTitle }}
</template>

<script>
import gql from 'graphql-tag'
import _ from 'lodash'
import { get } from 'vuex-pathify'

const SECTIONS = [
  { id: 'formateur', label: 'Formateur', icon: '★', match: (p) => /\/formateur$/i.test('/' + p) },
  { id: 'session', label: 'Session', icon: '◎', match: (p) => /\/stagiaire$/i.test('/' + p) },
  { id: 'intro', label: 'Introduction', icon: '◆', match: (p, t) => !p.replace(/^formations\/[^/]+\/?/, '') || /introduction/i.test(t) },
  { id: 'modules', label: 'Modules', icon: '▸', match: (p) => /\/(module|exercice|correction)-\d+/i.test('/' + p) },
  { id: 'annexes', label: 'Annexes', icon: '◇', match: (p) => /\/annexe-/i.test('/' + p) },
  { id: 'other', label: 'Ressources', icon: '•', match: () => true }
]

const PRACTICE_RE = /\/(exercice|correction)-(\d+)/i
const MODULE_RE = /\/module-(\d+)/i

// Nav embarquée au build webpack — évite fetch réseau (Safari mobile)
const navJsonContext = require.context('../../static/nav', false, /\.json$/)

function readNavBundle (filename) {
  const key = './' + filename
  if (!navJsonContext.keys().includes(key)) return null
  const mod = navJsonContext(key)
  return mod.default || mod
}

export default {
  props: {
    slug: { type: String, required: true }
  },
  data () {
    return {
      items: [],
      heroTitle: '',
      navLoading: false,
      navError: false
    }
  },
  computed: {
    path: get('page/path'),
    locale: get('page/locale'),
    isAuthenticated: get('user/authenticated'),
    permissions: get('user/permissions'),
    canSeeUnpublished () {
      if (!this.isAuthenticated) return false
      const elevated = ['manage:system', 'write:pages', 'manage:pages']
      return (this.permissions || []).some(p => elevated.includes(p))
    },
    formateurHref () {
      const item = this.items.find(it => /\/formateur$/i.test('/' + it.path))
      if (!item) return `/${this.locale}/formations/${this.slug}/formateur`
      const href = item.href || '/' + item.path
      return `/${this.locale}${href.startsWith('/') ? href : '/' + href}`
    },
    stagiaireHref () {
      const item = this.items.find(it => /\/stagiaire$/i.test('/' + it.path))
      if (!item) return `/${this.locale}/formations/${this.slug}/stagiaire`
      const href = item.href || '/' + item.path
      return `/${this.locale}${href.startsWith('/') ? href : '/' + href}`
    },
    isFormateurActive () {
      return /\/formateur$/i.test('/' + this.path)
    },
    isStagiaireActive () {
      return /\/stagiaire$/i.test('/' + this.path)
    },
    navItems () {
      return this.items.filter(item => this.linkVisible(item))
    },
    structureItems () {
      const prefix = 'formations/' + this.slug
      return this.items.filter(it => it.path === prefix || it.path.indexOf(prefix + '/') === 0)
    },
    moduleCount () {
      return this.navItems.filter(it => MODULE_RE.test('/' + it.path)).length
    },
    groups () {
      const scoped = this.structureItems
      const groups = SECTIONS.map(s => ({ ...s, items: [], blocks: [] }))
      const used = new Set()

      scoped.forEach(item => {
        for (const section of SECTIONS) {
          if (section.id === 'other') continue
          if (section.match(item.path, item.title)) {
            groups.find(g => g.id === section.id).items.push(this.decorate(item))
            used.add(item.path)
            return
          }
        }
      })

      scoped.filter(it => !used.has(it.path)).forEach(item => {
        groups.find(g => g.id === 'other').items.push(this.decorate(item))
      })

      return groups.filter(g => {
        if (g.id === 'formateur') return this.canSeeUnpublished && g.items.length > 0
        if (g.id === 'session') return g.items.length > 0
        if (g.id === 'modules') return g.items.length > 0
        return g.items.length > 0
      }).map(g => {
        if (g.id === 'modules') {
          return { ...g, blocks: this.buildModuleBlocks(g.items), items: [] }
        }
        g.items.sort((a, b) => a.title.localeCompare(b.title, 'fr'))
        return g
      })
    },
    hasNavContent () {
      return this.groups.length > 0 || this.items.length > 0
    }
  },
  watch: {
    slug: {
      immediate: true,
      handler () { this.loadItems() }
    },
    locale () { this.loadItems() },
    isAuthenticated () { this.loadItems() }
  },
  mounted () {
    this.$root.$on('formation-nav-refresh', this.loadItems)
    this.$root.$on('formation-nav-assets-refresh', this.requestNavAssetsRefresh)
  },
  beforeDestroy () {
    this.$root.$off('formation-nav-refresh', this.loadItems)
    this.$root.$off('formation-nav-assets-refresh', this.requestNavAssetsRefresh)
  },
  methods: {
    linkVisible (item) {
      return item && (item.isPublished !== false || this.canSeeUnpublished)
    },
    moduleNum (path) {
      const m = (path || '').match(/(?:module|exercice|correction)-(\d+)/i)
      return m ? parseInt(m[1], 10) : 99
    },
    decorate (item) {
      const num = this.moduleNum(item.path)
      let shortTitle = item.title
      const mod = shortTitle.match(/^Module\s+\d+\s*[—–-]\s*(.+)$/i)
      if (mod) shortTitle = mod[1]
      if (/^annexe-/i.test(item.path.split('/').pop())) {
        shortTitle = shortTitle.replace(/^Annexe\s*[—–-]\s*/i, '')
      }
      return {
        ...item,
        href: '/' + this.locale + '/' + item.path,
        shortTitle,
        badge: num < 90 ? String(num).padStart(2, '0') : null,
        moduleNum: num
      }
    },
    decoratePractice (item, kind) {
      const base = this.decorate(item)
      let shortTitle = base.shortTitle
      if (kind === 'exercice') {
        shortTitle = shortTitle.replace(/^Exercices\s*[—–-]\s*/i, '').trim() || 'Exercices'
      } else {
        shortTitle = shortTitle.replace(/^Correction\s*[—–-]\s*/i, '').trim() || 'Correction'
      }
      return { ...base, shortTitle, practiceKind: kind }
    },
    buildModuleBlocks (items) {
      const practiceByNum = {}
      const modules = []

      items.forEach(item => {
        const pr = item.path.match(PRACTICE_RE)
        if (pr) {
          const num = parseInt(pr[2], 10)
          if (!practiceByNum[num]) practiceByNum[num] = {}
          practiceByNum[num][pr[1].toLowerCase()] = item
          return
        }
        const mo = item.path.match(MODULE_RE)
        if (mo) modules.push({ num: parseInt(mo[1], 10), module: item })
      })

      modules.sort((a, b) => a.num - b.num)
      const usedPractice = new Set()
      const blocks = modules.map(({ num, module }) => {
        const pr = practiceByNum[num]
        if (pr) usedPractice.add(num)
        return {
          moduleNum: num,
          badge: String(num).padStart(2, '0'),
          module: module,
          practice: pr && (pr.exercice || pr.correction)
            ? {
                exercice: pr.exercice ? this.decoratePractice(pr.exercice, 'exercice') : null,
                correction: pr.correction ? this.decoratePractice(pr.correction, 'correction') : null
              }
            : null
        }
      })

      Object.keys(practiceByNum).forEach(numStr => {
        const num = parseInt(numStr, 10)
        if (usedPractice.has(num)) return
        const pr = practiceByNum[num]
        blocks.push({
          moduleNum: num,
          badge: String(num).padStart(2, '0'),
          module: null,
          practice: {
            exercice: pr.exercice ? this.decoratePractice(pr.exercice, 'exercice') : null,
            correction: pr.correction ? this.decoratePractice(pr.correction, 'correction') : null
          }
        })
      })

      return blocks.sort((a, b) => a.moduleNum - b.moduleNum)
    },
    blockKey (block) {
      return 'm' + block.moduleNum + '-' + (block.module ? block.module.path : 'practice')
    },
    practiceAriaLabel (block) {
      return 'Exercice et correction — module ' + String(block.moduleNum).padStart(2, '0')
    },
    practiceLinkClass (item) {
      return {
        'rs-nav-practice-link': true,
        'rs-nav-practice-link--active': this.isActive(item.href),
        ['rs-nav-practice-link--' + item.practiceKind]: true
      }
    },
    isActive (href) {
      const current = '/' + this.locale + '/' + this.path
      return href.replace(/\/$/, '') === current.replace(/\/$/, '')
    },
    onNavigate () {
      this.$emit('navigate')
      this.$root.$emit('close-formation-nav')
    },
    readBundledNav (slug) {
      return readNavBundle(slug + '.json')
    },
    readBundledPublished (slug) {
      return readNavBundle(slug + '-published.json')
    },
    applyNavData (data) {
      this.items = (data.items || []).map(it => ({
        path: it.path,
        title: it.title,
        href: it.href || '/' + it.path,
        isPublished: it.isPublished !== false
      }))
      this.heroTitle = data.title || this.slug.replace(/-/g, ' ')
    },
    applyPublishedPaths (paths) {
      const publishedSet = new Set(paths || [])
      this.items = this.items.map(it => ({
        ...it,
        isPublished: publishedSet.has(it.path)
      }))
    },
    async fetchJson (url, timeoutMs = 6000) {
      const fetchPromise = fetch(url, { cache: 'reload' }).then(res => {
        if (!res.ok) throw new Error('http ' + res.status)
        return res.json()
      })
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      })
      return Promise.race([fetchPromise, timeoutPromise])
    },
    async loadItems () {
      if (!this.slug) return
      const prefix = 'formations/' + this.slug
      this.navError = false

      // Bundle webpack = fallback immédiat ; le réseau prime toujours
      // (évite une nav figée après ajout de modules sans rebuild thème).
      const bundled = this.readBundledNav(this.slug)
      if (bundled) {
        this.applyNavData(bundled)
        this.navLoading = false
      } else {
        this.navLoading = true
      }

      try {
        const audience = this.canSeeUnpublished ? 'formateur' : 'stagiaire'
        let fromLmsApi = false
        let data
        try {
          data = await this.fetchJson(
            '/api/v1/public/sessions/by-slug/' +
              encodeURIComponent(this.slug) +
              '/nav?audience=' +
              audience +
              '&t=' +
              Date.now()
          )
          if (data && Array.isArray(data.items) && data.items.length) {
            this.applyNavData(data)
            fromLmsApi = true
          }
        } catch (e) {
          // fallback assets statiques ci-dessous
        }

        if (!this.items.length) {
          try {
            try {
              data = await this.fetchJson('/_assets/nav/' + encodeURIComponent(this.slug) + '.json?t=' + Date.now())
            } catch (e) {
              await new Promise(r => setTimeout(r, 300))
              data = await this.fetchJson('/_assets/nav/' + encodeURIComponent(this.slug) + '.json?t=' + Date.now())
            }
            if (data && Array.isArray(data.items) && data.items.length) {
              this.applyNavData(data)
            }
          } catch (e) {
            if (!this.items.length) throw e
          }
        }

        if (!this.items.length) return

        if (!this.canSeeUnpublished && !fromLmsApi) {
          const pubBundled = this.readBundledPublished(this.slug)
          if (pubBundled) {
            this.applyPublishedPaths(pubBundled.paths)
          }
          try {
            const pub = await this.fetchJson(
              '/_assets/nav/' + encodeURIComponent(this.slug) + '-published.json?t=' + Date.now(),
              4000
            )
            if (pub && Array.isArray(pub.paths)) {
              this.applyPublishedPaths(pub.paths)
            }
          } catch (e) {
            // bundle published suffit ; sinon modules restent en « bientôt disponible »
          }
          return
        }

        if (!this.locale) return

        try {
          const resp = await this.$apollo.query({
            query: gql`
              query ($locale: String!) {
                pages {
                  list(limit: 500, locale: $locale, orderBy: PATH) {
                    path
                    title
                    isPublished
                  }
                }
              }
            `,
            fetchPolicy: 'network-only',
            variables: { locale: this.locale }
          })
          const list = _.get(resp, 'data.pages.list', [])
          const publishedByPath = new Map(
            list
              .filter(p => p.path === prefix || p.path.indexOf(prefix + '/') === 0)
              .map(p => [p.path, p.isPublished !== false])
          )
          if (!publishedByPath.size) return
          this.items = this.items.map(it => ({
            ...it,
            title: publishedByPath.has(it.path)
              ? (list.find(p => p.path === it.path) || {}).title || it.title
              : it.title,
            isPublished: publishedByPath.has(it.path)
              ? publishedByPath.get(it.path)
              : it.isPublished
          }))
        } catch (e) {
          // nav bundle suffit pour formateurs
        }
      } catch (e) {
        if (!this.items.length) {
          this.heroTitle = this.slug.replace(/-/g, ' ')
          this.navError = true
        }
      } finally {
        this.navLoading = false
      }
    },
    async requestNavAssetsRefresh () {
      try {
        const jwt = document.cookie.match(/(?:^|;\s*)jwt=([^;]+)/)
        if (!jwt) return
        await fetch('/_redstone/refresh-nav/' + encodeURIComponent(this.slug), {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + decodeURIComponent(jwt[1]) },
          cache: 'no-store'
        })
      } catch (e) {
        // rafraîchissement best-effort
      }
      await this.loadItems()
    }
  }
}
</script>
