<template lang="pug">
  .rs-mes-sessions
    v-alert.mb-4(v-if='error', type='error', dense, outlined) {{ error }}
    v-skeleton-loader(v-if='loading', type='article, table-row@4')

    template(v-else)
      header.rs-mes-sessions-hero
        .rs-mes-sessions-kicker Espace formateur
        h1.rs-mes-sessions-title Mes sessions
        p.rs-mes-sessions-sub
          | Retrouvez vos formations en cours et à venir — dates, état, publication et indicateurs.

      v-alert.mb-4(v-if='!sessions.length', type='info', outlined, dense, icon='mdi-information-outline')
        | Aucune session assignée pour le moment. Contactez RedStone si vous attendez une formation.

      .rs-mes-sessions-grid(v-else)
        v-card.rs-mes-sessions-card(
          v-for='item in sessions'
          :key='item.sessionId'
          flat
          )
          v-card-text
            .rs-mes-sessions-card-head
              .rs-mes-sessions-card-main
                h2.rs-mes-sessions-card-title {{ item.title }}
                p.rs-mes-sessions-card-client(v-if='item.client') {{ item.client }}
                p.rs-mes-sessions-card-meta
                  span {{ item.dates.label }}
                  span(v-if='item.location') · {{ item.location }}
                  span(v-if='item.modality') · {{ item.modality }}
                  span(v-if='item.reference') · Réf. {{ item.reference }}
              span.rs-mes-sessions-state(:class='stateClass(item.state)') {{ item.state_label }}

            v-alert.mt-3.mb-0(
              v-if='item.indicators?.readiness?.alert'
              type='error'
              dense
              outlined
              border='left'
              icon='mdi-alert-circle-outline'
              ) {{ item.indicators.readiness.message }}

            .rs-mes-sessions-indicators.mt-3(v-if='item.indicators')
              span.rs-mes-sessions-indicator(
                v-for='ind in indicatorItems(item)'
                :key='ind.id'
                :class='indicatorClass(ind)'
                )
                v-icon.mr-1(x-small) {{ ind.icon }}
                | {{ ind.label }}

            .rs-mes-sessions-progress.mt-4(v-if='item.publication?.total')
              .rs-mes-sessions-progress-head
                span Publication
                strong {{ item.publication_percent }}%
              v-progress-linear(
                :value='item.publication_percent'
                color='primary'
                height='8'
                rounded
                )
              .rs-mes-sessions-progress-meta
                span {{ item.publication.published }} / {{ item.publication.total }} modules publiés
                span(v-if='item.publication.draft') · {{ item.publication.draft }} brouillon(s)

            .rs-mes-sessions-actions.mt-4
              a.rs-mes-sessions-btn.rs-mes-sessions-btn--primary(:href='localeHref(item.cockpit_href)')
                v-icon.mr-2(small) mdi-view-dashboard-outline
                | Ouvrir le cockpit
              a.rs-mes-sessions-btn(:href='localeHref(item.stagiaire_href)', target='_blank', rel='noopener')
                v-icon.mr-2(small) mdi-account-group-outline
                | Hub stagiaire
</template>

<script>
export default {
  props: {
    locale: { type: String, default: 'fr' }
  },
  data () {
    return {
      loading: true,
      error: '',
      sessions: []
    }
  },
  async mounted () {
    await this.load()
  },
  methods: {
    localeHref (href) {
      if (!href) return '#'
      if (/^https?:\/\//i.test(href)) return href
      if (href.startsWith(`/${this.locale}/`)) return href
      if (href.startsWith('/')) return `/${this.locale}${href}`
      return `/${this.locale}/${href}`
    },
    stateClass (state) {
      return `rs-mes-sessions-state--${state || 'draft'}`
    },
    indicatorItems (item) {
      const ind = item.indicators || {}
      return [
        { id: 'teams', label: 'Teams', icon: 'mdi-microsoft-teams', ok: ind.teams?.ok },
        { id: 'emargement', label: 'Émargement', icon: 'mdi-clipboard-check-outline', ok: ind.emargement?.ok }
      ]
    },
    indicatorClass (item) {
      return item.ok ? 'rs-mes-sessions-indicator--ok' : 'rs-mes-sessions-indicator--missing'
    },
    async load () {
      this.loading = true
      this.error = ''
      try {
        const res = await fetch('/api/formation/mes-sessions', { credentials: 'same-origin' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error?.message || `Erreur ${res.status}`)
        }
        const data = await res.json()
        this.sessions = data.sessions || []
      } catch (e) {
        this.error = e.message || String(e)
        this.sessions = []
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
