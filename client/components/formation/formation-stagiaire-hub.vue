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
          a.rs-stagiaire-tile(
            :href='linkHref(link)'
            :target='link.external ? "_blank" : null'
            :rel='link.external ? "noopener" : null'
            :class='tileClass(link)'
            )
            v-icon.rs-stagiaire-tile-icon {{ link.icon || 'mdi-open-in-new' }}
            strong.rs-stagiaire-tile-label {{ link.label }}
            span.rs-stagiaire-tile-desc {{ link.description }}
            span.rs-stagiaire-tile-hint(v-if='!link.url') Lien à venir — demandez au formateur

        v-col(cols='12', md='6', lg='4', v-for='link in secondaryLinks', :key='link.id')
          a.rs-stagiaire-tile.rs-stagiaire-tile--secondary(
            :href='linkHref(link)'
            :target='link.external ? "_blank" : null'
            :rel='link.external ? "noopener" : null'
            :class='{ "rs-stagiaire-tile--disabled": !link.url }'
            )
            v-icon.rs-stagiaire-tile-icon(small) {{ link.icon || 'mdi-link' }}
            strong.rs-stagiaire-tile-label {{ link.label }}
            span.rs-stagiaire-tile-desc(v-if='link.description') {{ link.description }}

        v-col(cols='12', v-if='data.trainer')
          .rs-stagiaire-trainer
            v-icon.mr-2(small) mdi-account-tie
            | Formateur : {{ data.trainer }}
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
    tileClass (link) {
      return {
        'rs-stagiaire-tile--disabled': !link.url
      }
    },
    linkHref (link) {
      if (!link.url) return '#'
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
        const res = await fetch(`/_assets/stagiaires/${encodeURIComponent(this.slug)}.json`)
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
