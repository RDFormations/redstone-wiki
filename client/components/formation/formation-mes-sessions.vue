<template lang="pug">
  .rs-mes-sessions
    v-alert.mb-4(v-if='error', type='error', dense, outlined) {{ error }}
    v-skeleton-loader(v-if='loading', type='article, table-row@3')

    template(v-else)
      header.rs-mes-sessions-hero
        .rs-mes-sessions-hero-top
          div
            .rs-mes-sessions-kicker Espace formateur
            h1.rs-mes-sessions-title Mes sessions
            p.rs-mes-sessions-sub
              | Vue d’ensemble de vos formations — dates, état, publication et indicateurs de préparation.
          .rs-mes-sessions-hero-badge(v-if='sessions.length')
            v-icon.mr-2(color='primary') mdi-calendar-multiselect
            strong {{ sessions.length }}
            span session{{ sessions.length > 1 ? 's' : '' }}

        .rs-mes-sessions-hero-stats(v-if='sessions.length')
          .rs-mes-sessions-stat
            strong {{ summary.upcoming }}
            span à venir / en cours
          .rs-mes-sessions-stat
            strong {{ summary.avgPublication }}%
            span publication moyenne
          .rs-mes-sessions-stat(:class='{ "rs-mes-sessions-stat--alert": summary.alerts > 0 }')
            strong {{ summary.alerts }}
            span alerte{{ summary.alerts > 1 ? 's' : '' }} J-48 h

      .rs-mes-sessions-empty(v-if='!sessions.length')
        v-icon.rs-mes-sessions-empty-icon(color='primary', large) mdi-calendar-blank-outline
        h2.rs-mes-sessions-empty-title Aucune session pour le moment
        p.rs-mes-sessions-empty-text
          | Vos formations apparaîtront ici dès qu’une session vous sera assignée (compte formateur ou email Monday).
        p.rs-mes-sessions-empty-hint Contactez RedStone si vous attendez un accès.

      v-row.rs-mes-sessions-grid(v-else, dense)
        v-col(
          v-for='item in sessions'
          :key='item.sessionId'
          cols='12'
          lg='6'
          )
          article.rs-mes-sessions-card(:class='cardStateClass(item)')
            .rs-mes-sessions-card-head
              .rs-mes-sessions-card-main
                .rs-mes-sessions-card-title-row
                  h2.rs-mes-sessions-card-title {{ item.title }}
                  span.rs-formateur-badge(:class='stateBadgeClass(item.state)') {{ item.state_label }}
                p.rs-mes-sessions-card-client(v-if='item.client')
                  v-icon.mr-1(x-small) mdi-domain
                  | {{ item.client }}
                p.rs-mes-sessions-card-meta
                  v-icon.mr-1(x-small) mdi-calendar-range
                  span {{ item.dates.label }}
                p.rs-mes-sessions-card-meta(v-if='item.location || item.modality || item.reference')
                  v-icon.mr-1(x-small) mdi-map-marker-outline
                  span
                    template(v-if='item.location') {{ item.location }}
                    template(v-if='item.modality') {{ item.location ? ' · ' : '' }}{{ item.modality }}
                    template(v-if='item.reference') {{ (item.location || item.modality) ? ' · ' : '' }}Réf. {{ item.reference }}
                p.rs-mes-sessions-card-hint(v-if='item.state_hint') {{ item.state_hint }}

            v-alert.mt-3.mb-0(
              v-if='item.indicators?.readiness?.alert'
              type='error'
              dense
              outlined
              border='left'
              icon='mdi-alert-circle-outline'
              ) {{ item.indicators.readiness.message }}

            .rs-formateur-indicators.mt-3(v-if='item.indicators')
              span.rs-formateur-indicator(
                v-for='ind in indicatorItems(item)'
                :key='ind.id'
                :class='indicatorClass(ind)'
                )
                v-icon.mr-1(x-small) {{ ind.icon }}
                | {{ ind.label }}

            .rs-formateur-hero-progress.mt-4(v-if='item.publication?.total')
              .rs-formateur-hero-progress-head
                span Publication stagiaire
                strong {{ item.publication_percent }}%
              v-progress-linear(
                :value='item.publication_percent'
                color='primary'
                height='8'
                rounded
                )
              .rs-formateur-hero-progress-meta
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
const ACTIVE_STATES = new Set(['draft_ready', 'distributed', 'live', 'incomplete'])

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
  computed: {
    summary () {
      const list = this.sessions || []
      const upcoming = list.filter(s => ACTIVE_STATES.has(s.state)).length
      const alerts = list.filter(s => s.indicators?.readiness?.alert).length
      const withPub = list.filter(s => s.publication?.total > 0)
      const avgPublication = withPub.length
        ? Math.round(withPub.reduce((sum, s) => sum + (s.publication_percent || 0), 0) / withPub.length)
        : 0
      return { upcoming, alerts, avgPublication }
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
    cardStateClass (item) {
      return `rs-mes-sessions-card--${item.state || 'draft'}`
    },
    stateBadgeClass (state) {
      const map = {
        distributed: 'rs-mes-sessions-badge--ok',
        live: 'rs-mes-sessions-badge--ok',
        draft_ready: 'rs-mes-sessions-badge--ready',
        incomplete: 'rs-mes-sessions-badge--warn',
        archived: 'rs-mes-sessions-badge--muted',
        draft: 'rs-mes-sessions-badge--muted'
      }
      return map[state] || 'rs-mes-sessions-badge--muted'
    },
    indicatorItems (item) {
      const ind = item.indicators || {}
      return [
        { id: 'teams', label: 'Teams', icon: 'mdi-microsoft-teams', ok: ind.teams?.ok },
        { id: 'emargement', label: 'Émargement', icon: 'mdi-clipboard-check-outline', ok: ind.emargement?.ok }
      ]
    },
    indicatorClass (item) {
      return item.ok ? 'rs-formateur-indicator--ok' : 'rs-formateur-indicator--missing'
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
