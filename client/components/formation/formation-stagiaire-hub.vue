<template lang="pug">
  .rs-stagiaire-hub
    v-alert.mb-4(v-if='error', type='error', dense, outlined) {{ error }}
    v-skeleton-loader(v-if='loading', type='article, actions')

    template(v-else-if='data')
      header.rs-stagiaire-hero
        .rs-stagiaire-hero-kicker Votre formation
        h1.rs-stagiaire-hero-title {{ data.title }}
        p.rs-stagiaire-hero-sub(v-if='data.client') {{ data.client }}
        p.rs-stagiaire-hero-welcome {{ data.welcome }}
        .rs-stagiaire-hero-meta(v-if='metaLine')
          span {{ metaLine }}

      v-row.rs-stagiaire-grid(dense)
        v-col(cols='12', md='6', lg='4', v-for='link in primaryLinks', :key='link.id')
          component.rs-stagiaire-tile(
            :is='link.url ? "a" : "div"'
            :href='link.url ? linkHref(link) : null'
            :target='link.url && link.external ? "_blank" : null'
            :rel='link.url && link.external ? "noopener" : null'
            :class='tileClass(link)'
            :aria-disabled='!link.url || undefined'
            )
            v-icon.rs-stagiaire-tile-icon {{ link.icon || 'mdi-open-in-new' }}
            strong.rs-stagiaire-tile-label {{ link.label }}
            span.rs-stagiaire-tile-desc {{ link.description }}
            span.rs-stagiaire-tile-hint(v-if='!link.url') Lien à venir — demandez au formateur

        v-col(cols='12', md='6', lg='4', v-for='link in secondaryLinks', :key='link.id')
          component.rs-stagiaire-tile.rs-stagiaire-tile--secondary(
            :is='link.url ? "a" : "div"'
            :href='link.url ? linkHref(link) : null'
            :target='link.url && link.external ? "_blank" : null'
            :rel='link.url && link.external ? "noopener" : null'
            :class='{ "rs-stagiaire-tile--disabled": !link.url }'
            :aria-disabled='!link.url || undefined'
            )
            v-icon.rs-stagiaire-tile-icon(small) {{ link.icon || 'mdi-link' }}
            strong.rs-stagiaire-tile-label {{ link.label }}
            span.rs-stagiaire-tile-desc(v-if='link.description') {{ link.description }}

        v-col(cols='12', v-if='data.trainer')
          .rs-stagiaire-trainer
            v-icon.mr-2(small) mdi-account-tie
            | Formateur : {{ data.trainer }}

        v-col(cols='12', v-if='labs.length')
          .rs-stagiaire-labs
            h2.rs-stagiaire-labs-title
              v-icon.mr-2(small) mdi-folder-zip-outline
              | Labs / fichiers pratiques
            a.rs-stagiaire-lab(
              v-for='lab in labs'
              :key='lab.id || lab.url'
              :href='lab.url'
              target='_blank'
              rel='noopener'
              )
              v-icon.mr-2(small) mdi-download
              span {{ lab.label || lab.filename }}
              span.rs-stagiaire-lab-size(v-if='lab.size_bytes')  ({{ formatSize(lab.size_bytes) }})
</template>

<script>
export default {
  props: {
    slug: { type: String, required: true },
    locale: { type: String, default: 'fr' }
  },
  data () {
    return {
      loading: true,
      error: '',
      data: null
    }
  },
  computed: {
    labs () {
      return (this.data && this.data.labs) || []
    },
    metaLine () {
      if (!this.data) return ''
      const parts = []
      if (this.dateRange) parts.push(this.dateRange)
      if (this.data.location) parts.push(this.data.location)
      if (this.data.modality) parts.push(this.data.modality)
      if (this.data.reference) parts.push('Réf. ' + this.data.reference)
      return parts.join(' · ')
    },
    dateRange () {
      if (!this.data || !this.data.dates) return ''
      const { start, end } = this.data.dates
      if (!start) return ''
      if (!end || end === start) return this.formatDate(start)
      return `${this.formatDate(start)} → ${this.formatDate(end)}`
    },
    primaryLinks () {
      return (this.data && this.data.links || []).filter(l => l.primary)
    },
    secondaryLinks () {
      return (this.data && this.data.links || []).filter(l => !l.primary)
    }
  },
  watch: {
    slug: { immediate: true, handler () { this.load() } }
  },
  methods: {
    formatSize (bytes) {
      const n = Number(bytes) || 0
      if (n < 1024) return `${n} o`
      if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`
      return `${(n / (1024 * 1024)).toFixed(1)} Mo`
    },
    tileClass (link) {
      return {
        'rs-stagiaire-tile--disabled': !link.url
      }
    },
    linkHref (link) {
      if (!link.url) return null
      if (link.url.startsWith('http') || link.url.startsWith('mailto:')) return link.url
      return this.localeHref(link.url)
    },
    localeHref (href) {
      if (!href) return '#'
      if (href.startsWith('http') || href.startsWith('mailto:')) return href
      const path = href.startsWith('/') ? href.slice(1) : href
      return `/${this.locale}/${path}`
    },
    formatDate (iso) {
      try {
        return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })
      } catch (e) {
        return iso
      }
    },
    async load () {
      if (!this.slug) return
      this.loading = true
      this.error = ''
      try {
        const apiUrl = `/api/v1/public/sessions/by-slug/${encodeURIComponent(this.slug)}/hub`
        let res = await fetch(apiUrl, { cache: 'no-store' })
        if (res.ok) {
          const payload = await res.json()
          this.data = payload.hub
          return
        }
        res = await fetch(`/_assets/stagiaires/${encodeURIComponent(this.slug)}.json`)
        if (!res.ok) throw new Error('Liens session introuvables')
        this.data = await res.json()
      } catch (e) {
        this.error = e.message || String(e)
        this.data = null
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
