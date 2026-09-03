<template lang="pug">
  v-container(fluid)
    v-layout(row wrap)
      v-col(cols='12')
        .admin-header
          v-icon.mr-3(large, color='primary') mdi-school
          .admin-header-title
            .headline.primary--text Sessions formations
            .subtitle-1.grey--text Gestion OPS RedStone (F13)
          v-spacer
          v-btn.mr-2(color='primary', depressed, @click='createOpen = true')
            v-icon(left, small) mdi-plus
            | Nouvelle session
          v-btn(icon, outlined, color='grey', @click='load')
            v-icon mdi-refresh

        v-card.mt-3
          v-card-text
            v-row(dense)
              v-col(cols='12', md='4')
                v-text-field(
                  v-model='filters.q'
                  label='Recherche'
                  prepend-inner-icon='mdi-magnify'
                  dense
                  outlined
                  hide-details
                  clearable
                  @keyup.enter='applyFilters'
                )
              v-col(cols='6', md='2')
                v-select(
                  v-model='filters.state'
                  :items='stateItems'
                  label='État'
                  dense
                  outlined
                  hide-details
                  clearable
                )
              v-col(cols='6', md='2')
                v-select(
                  v-model='filters.date_preset'
                  :items='datePresetItems'
                  label='Dates'
                  dense
                  outlined
                  hide-details
                )
              v-col(cols='6', md='2')
                v-select(
                  v-model='filters.published'
                  :items='publishedItems'
                  label='Publié'
                  dense
                  outlined
                  hide-details
                )
              v-col(cols='6', md='2')
                v-select(
                  v-model='filters.terminated'
                  :items='terminatedItems'
                  label='Terminé'
                  dense
                  outlined
                  hide-details
                )
            v-row.mt-2(dense)
              v-col
                v-btn(color='primary', depressed, @click='applyFilters') Filtrer
                v-btn.ml-2(text, @click='resetFilters') Réinitialiser

          v-data-table(
            :headers='headers'
            :items='sessions'
            :loading='loading'
            :server-items-length='total'
            :options.sync='tableOptions'
            :footer-props='{ "items-per-page-options": [25, 50, 100] }'
            item-key='id'
            @update:options='onTableOptions'
          )
            template(v-slot:item.state='{ item }')
              v-chip(small, :color='stateColor(item.state)', text-color='white') {{ item.state }}
            template(v-slot:item.publication='{ item }')
              span {{ item.publication.label }}
            template(v-slot:item.business_status='{ item }')
              span.text-capitalize {{ businessLabel(item.business_status) }}
            template(v-slot:item.dates='{ item }')
              span {{ formatDates(item) }}
            template(v-slot:item.actions='{ item }')
              v-btn(icon, small, :href='item.links.stagiaire', target='_blank', title='Hub stagiaire')
                v-icon(small) mdi-account-group
              v-btn(icon, small, :href='item.links.formateur', target='_blank', title='Cockpit formateur')
                v-icon(small) mdi-account-tie
              v-btn(v-if='item.monday_url', icon, small, :href='item.monday_url', target='_blank', title='Monday')
                v-icon(small) mdi-view-dashboard
              v-btn(icon, small, @click='openDetail(item)', title='Détail')
                v-icon(small) mdi-information-outline

    v-dialog(v-model='detailOpen', max-width='880')
      v-card(v-if='detail')
        v-card-title {{ detail.session.title }}
        v-card-subtitle {{ detail.session.client }} · {{ detail.session.slug }}
        v-card-text
          v-simple-table(dense)
            tbody
              tr
                td État
                td {{ detail.session.state }}
              tr
                td O03
                td
                  | prêt={{ detail.session.content_ready ? 'oui' : 'non' }},
                  | distribué={{ detail.session.distributed ? 'oui' : 'non' }},
                  | support={{ detail.session.support_ready ? 'oui' : 'non' }}
              tr
                td Publication
                td {{ detail.session.publication.label }}
              tr
                td Monday
                td
                  a(v-if='detail.session.monday_url', :href='detail.session.monday_url', target='_blank') {{ detail.session.monday_item_id }}
          div.mt-4(v-if='distributeErrors.length')
            v-alert(type='error', dense, outlined)
              .subtitle-2.mb-2 Distribution bloquée
              ul.mb-0
                li(v-for='(check, idx) in distributeErrors', :key='idx')
                  | {{ check.checkId || check.id }} — {{ check.message }}
          div.mt-4(v-else-if='detail.health_checks && detail.health_checks.length')
            .subtitle-2 Contrôles santé
            ul
              li(v-for='check in detail.health_checks', :key='check.id || check.checkId')
                | {{ check.checkId }} — {{ check.level }}: {{ check.message }}
          div.mt-4
            .subtitle-2.mb-2 Traçabilité PDC (C04)
            formation-pdc-diff(:session-id='detail.session.id')
          div.mt-4
            .subtitle-2.mb-2 Branding client (B02)
            v-row(dense)
              v-col(cols='12', md='6')
                v-text-field(
                  v-model='brandingForm.logo_url'
                  label='Logo URL'
                  dense
                  outlined
                  hint='/_assets/branding/... ou https://'
                  persistent-hint
                )
              v-col(cols='6', md='3')
                v-text-field(
                  v-model='brandingForm.primary_color'
                  label='Couleur primaire'
                  dense
                  outlined
                  hint='#RRGGBB'
                  persistent-hint
                )
              v-col(cols='6', md='3')
                v-text-field(
                  v-model='brandingForm.accent_color'
                  label='Accent'
                  dense
                  outlined
                  hint='#RRGGBB'
                  persistent-hint
                )
            v-btn.mt-2(
              color='primary'
              depressed
              small
              :loading='savingBranding'
              @click='saveBranding'
              ) Enregistrer branding
            .caption.grey--text.mt-2(v-if='resolvedBranding')
              | Source : {{ resolvedBranding.source }} ·
              a(:href='resolvedBranding.logo_url', target='_blank') aperçu logo
        v-card-actions
          v-spacer
          v-btn(
            v-if='detail.session.actions && detail.session.actions.can_distribute'
            color='green'
            depressed
            :loading='distributing'
            @click='distributeSession'
            ) Distribuer (F02)
          v-btn(
            v-if='detail.session.monday_item_id'
            color='primary'
            text
            :loading='pushingMonday'
            @click='pushMonday'
            ) Sync Monday (M03)
          v-btn(text, @click='detailOpen = false') Fermer

    v-dialog(v-model='createOpen', max-width='560')
      v-card
        v-card-title Nouvelle session (F07)
        v-card-text
          v-alert.mb-3(v-if='createError', type='error', dense, outlined) {{ createError }}
          v-text-field(v-model='createForm.slug', label='Slug *', dense, outlined, hint='ex. quiris-admin-m365')
          v-text-field(v-model='createForm.title', label='Titre', dense, outlined)
          v-text-field(v-model='createForm.client', label='Client', dense, outlined)
          v-text-field(v-model='createForm.monday_item_id', label='Monday item ID *', dense, outlined)
          v-text-field(v-model='createForm.ref_client', label='Réf. client', dense, outlined)
          v-select(v-model='createForm.locale_default', :items='["fr", "en"]', label='Locale', dense, outlined)
        v-card-actions
          v-spacer
          v-btn(text, @click='createOpen = false') Annuler
          v-btn(color='primary', depressed, :loading='creating', @click='createSession') Créer
</template>

<script>
import _ from 'lodash'
import { get } from 'vuex-pathify'
import FormationPdcDiff from '../formation/formation-pdc-diff.vue'

const DEFAULT_FILTERS = () => ({
  q: '',
  state: null,
  date_preset: 'all',
  published: 'all',
  terminated: 'no'
})

export default {
  components: { FormationPdcDiff },
  data () {
    return {
      loading: false,
      sessions: [],
      total: 0,
      filters: DEFAULT_FILTERS(),
      tableOptions: { page: 1, itemsPerPage: 25, sortBy: [], sortDesc: [] },
      detailOpen: false,
      detail: null,
      createOpen: false,
      creating: false,
      createError: '',
      createForm: {
        slug: '',
        title: '',
        client: '',
        monday_item_id: '',
        ref_client: '',
        locale_default: 'fr'
      },
      distributeErrors: [],
      pushingMonday: false,
      distributing: false,
      savingBranding: false,
      brandingForm: {
        logo_url: '',
        primary_color: '',
        accent_color: ''
      },
      resolvedBranding: null,
      headers: [
        { text: 'Titre', value: 'title' },
        { text: 'Client', value: 'client' },
        { text: 'Réf.', value: 'ref_client' },
        { text: 'Dates', value: 'dates', sortable: false },
        { text: 'État', value: 'state' },
        { text: 'Publié', value: 'publication', sortable: false },
        { text: 'Statut', value: 'business_status' },
        { text: 'Actions', value: 'actions', sortable: false }
      ],
      stateItems: [
        { text: 'Tous', value: null },
        { text: 'draft', value: 'draft' },
        { text: 'draft_ready', value: 'draft_ready' },
        { text: 'distributed', value: 'distributed' },
        { text: 'incomplete', value: 'incomplete' },
        { text: 'live', value: 'live' },
        { text: 'archived', value: 'archived' }
      ],
      datePresetItems: [
        { text: 'Toutes', value: 'all' },
        { text: 'À venir 7j', value: 'upcoming_7' },
        { text: 'À venir 30j', value: 'upcoming_30' },
        { text: 'En cours', value: 'in_progress' },
        { text: 'Passées', value: 'past' }
      ],
      publishedItems: [
        { text: 'Tous', value: 'all' },
        { text: 'Au moins un publié', value: 'any' },
        { text: 'Aucun publié', value: 'none' },
        { text: 'Partiel', value: 'partial' },
        { text: 'Tous modules publiés', value: 'all_published' }
      ],
      terminatedItems: [
        { text: 'Non terminées', value: 'no' },
        { text: 'Terminées', value: 'yes' },
        { text: 'Toutes', value: 'all' }
      ]
    }
  },
  computed: {
    permissions: get('user/permissions')
  },
  watch: {
    '$route.query': {
      immediate: true,
      handler (q) {
        this.filters = { ...DEFAULT_FILTERS(), ...this.queryToFilters(q) }
        this.load()
      }
    }
  },
  mounted () {
    if (!_.includes(this.permissions, 'manage:system')) {
      this.$router.replace('/dashboard')
    }
  },
  methods: {
    queryToFilters (q) {
      return {
        q: q.q || '',
        state: q.state || null,
        date_preset: q.date_preset || 'all',
        published: q.published || 'all',
        terminated: q.terminated || 'no'
      }
    },
    filtersToQuery () {
      const q = {}
      if (this.filters.q) q.q = this.filters.q
      if (this.filters.state) q.state = this.filters.state
      if (this.filters.date_preset && this.filters.date_preset !== 'all') q.date_preset = this.filters.date_preset
      if (this.filters.published && this.filters.published !== 'all') q.published = this.filters.published
      if (this.filters.terminated && this.filters.terminated !== 'no') q.terminated = this.filters.terminated
      return q
    },
    applyFilters () {
      this.$router.replace({ query: this.filtersToQuery() }).catch(() => {})
    },
    resetFilters () {
      this.filters = DEFAULT_FILTERS()
      this.applyFilters()
    },
    onTableOptions () {
      this.load()
    },
    async load () {
      if (!_.includes(this.permissions, 'manage:system')) return
      this.loading = true
      try {
        const params = new URLSearchParams({
          limit: String(this.tableOptions.itemsPerPage || 25),
          offset: String(((this.tableOptions.page || 1) - 1) * (this.tableOptions.itemsPerPage || 25)),
          date_preset: this.filters.date_preset || 'all',
          published: this.filters.published || 'all',
          terminated: this.filters.terminated || 'no'
        })
        if (this.filters.q) params.set('q', this.filters.q)
        if (this.filters.state) params.set('state', this.filters.state)

        const res = await fetch(`/api/admin/sessions?${params}`, { credentials: 'same-origin' })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error?.message || `HTTP ${res.status}`)
        this.sessions = body.sessions || []
        this.total = body.total || 0
      } catch (e) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: e.message || 'Erreur chargement sessions',
          icon: 'alert'
        })
      } finally {
        this.loading = false
      }
    },
    async createSession () {
      this.creating = true
      this.createError = ''
      try {
        const payload = {
          slug: String(this.createForm.slug || '').trim().toLowerCase(),
          title: this.createForm.title || this.createForm.slug,
          client: this.createForm.client || 'Client',
          monday_item_id: this.createForm.monday_item_id,
          ref_client: this.createForm.ref_client || null,
          locale_default: this.createForm.locale_default || 'fr'
        }
        const res = await fetch('/api/admin/sessions', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error?.message || body.error?.code || `HTTP ${res.status}`)
        this.createOpen = false
        this.createForm = {
          slug: '', title: '', client: '', monday_item_id: '', ref_client: '', locale_default: 'fr'
        }
        this.$store.commit('showNotification', {
          style: 'green',
          message: `Session créée : ${body.session?.slug || payload.slug}`,
          icon: 'check'
        })
        await this.load()
      } catch (e) {
        this.createError = e.message || String(e)
      } finally {
        this.creating = false
      }
    },
    async openDetail (item) {
      try {
        const res = await fetch(`/api/admin/sessions/${item.id}`, { credentials: 'same-origin' })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error?.message || `HTTP ${res.status}`)
        this.detail = body
        this.distributeErrors = []
        this.hydrateBrandingForm(body.session)
        this.detailOpen = true
      } catch (e) {
        this.$store.commit('showNotification', { style: 'red', message: e.message, icon: 'alert' })
      }
    },
    hydrateBrandingForm (session) {
      const meta = (session && session.metadata && session.metadata.branding) || {}
      this.brandingForm = {
        logo_url: meta.logo_url || '',
        primary_color: meta.primary_color || '',
        accent_color: meta.accent_color || ''
      }
      this.resolvedBranding = (this.detail && this.detail.branding) || null
    },
    async saveBranding () {
      if (!this.detail?.session?.id) return
      this.savingBranding = true
      try {
        const payload = {}
        if (this.brandingForm.logo_url) payload.logo_url = this.brandingForm.logo_url.trim()
        if (this.brandingForm.primary_color) payload.primary_color = this.brandingForm.primary_color.trim()
        if (this.brandingForm.accent_color) payload.accent_color = this.brandingForm.accent_color.trim()
        const res = await fetch(`/api/admin/sessions/${this.detail.session.id}/branding`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error?.message || `HTTP ${res.status}`)
        this.resolvedBranding = body.branding
        this.$store.commit('showNotification', {
          style: 'green',
          message: `Branding enregistré (${body.branding?.source || 'ok'})`,
          icon: 'check'
        })
        await this.openDetail({ id: this.detail.session.id })
      } catch (e) {
        this.$store.commit('showNotification', { style: 'red', message: e.message, icon: 'alert' })
      } finally {
        this.savingBranding = false
      }
    },
    async distributeSession () {
      if (!this.detail?.session?.id) return
      this.distributing = true
      this.distributeErrors = []
      try {
        const res = await fetch(`/api/admin/sessions/${this.detail.session.id}/distribute`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
        const body = await res.json()
        if (!res.ok) {
          const blocking = (body.checks || []).filter(c => c.blocking || c.level === 'error')
          if (blocking.length) {
            this.distributeErrors = blocking
            if (body.checks) this.detail.health_checks = body.checks
          }
          throw new Error(body.error?.message || body.error?.code || `HTTP ${res.status}`)
        }
        this.$store.commit('showNotification', {
          style: 'green',
          message: `Session distribuée (${body.session?.state || 'ok'})`,
          icon: 'check'
        })
        await this.openDetail({ id: this.detail.session.id })
        await this.load()
      } catch (e) {
        this.$store.commit('showNotification', { style: 'red', message: e.message, icon: 'alert' })
      } finally {
        this.distributing = false
      }
    },
    async pushMonday () {
      if (!this.detail?.session?.id) return
      this.pushingMonday = true
      try {
        const res = await fetch(`/api/admin/sessions/${this.detail.session.id}/push-monday`, {
          method: 'POST',
          credentials: 'same-origin'
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error?.message || `HTTP ${res.status}`)
        this.$store.commit('showNotification', {
          style: 'green',
          message: `Monday mis à jour (${(body.monday?.updated || []).length} colonne(s))`,
          icon: 'check'
        })
        await this.openDetail({ id: this.detail.session.id })
      } catch (e) {
        this.$store.commit('showNotification', { style: 'red', message: e.message, icon: 'alert' })
      } finally {
        this.pushingMonday = false
      }
    },
    stateColor (state) {
      const map = {
        incomplete: 'red',
        draft: 'grey',
        draft_ready: 'orange',
        distributed: 'green',
        live: 'blue',
        archived: 'grey darken-1'
      }
      return map[state] || 'grey'
    },
    businessLabel (status) {
      const map = { upcoming: 'à venir', in_progress: 'en cours', terminated: 'terminée', unknown: '—' }
      return map[status] || status
    },
    formatDates (item) {
      const s = item.starts_at ? String(item.starts_at).slice(0, 10) : ''
      const e = item.ends_at ? String(item.ends_at).slice(0, 10) : ''
      if (!s) return '—'
      return e && e !== s ? `${s} → ${e}` : s
    }
  }
}
</script>
