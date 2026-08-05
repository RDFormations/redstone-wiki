<template lang="pug">
  .rs-formateur-hub
    v-alert.mb-4(v-if='error', type='error', dense, outlined) {{ error }}
    v-progress-linear(v-if='publishBusy', indeterminate, color='primary', height='3')
    v-skeleton-loader(v-if='loading', type='article, actions')

    template(v-else-if='data')
      header.rs-formateur-hero
        .rs-formateur-hero-kicker Espace formateur
        h1.rs-formateur-hero-title {{ data.title }}
        p.rs-formateur-hero-sub(v-if='data.client') {{ data.client }}
        .rs-formateur-hero-meta
          span(v-if='dateRange') {{ dateRange }}
          span(v-if='data.location') · {{ data.location }}
          span(v-if='data.modality') · {{ data.modality }}
          span(v-if='data.reference') · Réf. {{ data.reference }}
        .rs-formateur-hero-stats
          .rs-formateur-stat
            strong {{ data.publication.published }}
            span / {{ data.publication.total }} modules publiés
          .rs-formateur-stat(v-if='data.durationDays')
            strong {{ data.durationDays }}
            span jours
          .rs-formateur-stat(v-if='data.participants')
            strong {{ data.participants }}
            span participant(s)
          button.rs-formateur-copy.mt-2(type='button', @click='copyConvocationMessage')
            v-icon.mr-2(small) mdi-email-outline
            | Copier message convocation

      v-row.rs-formateur-grid(dense)
        v-col(cols='12', md='4')
          v-card.rs-formateur-card.rs-formateur-qr-card(flat)
            v-card-title.rs-formateur-card-title
              v-icon.mr-2(color='primary', small) mdi-qrcode
              | QR code stagiaires
            v-card-text.pt-0
              .rs-formateur-qr-wrap(v-if='data.stagiaireQrSvg', v-html='data.stagiaireQrSvg')
              .rs-formateur-qr-fallback(v-else)
                v-icon(large, color='grey') mdi-qrcode
                span.caption.grey--text QR indisponible
              p.rs-formateur-qr-caption Scannez pour ouvrir la page liens session (émargement, support…)
              code.rs-formateur-qr-url {{ data.stagiaireUrl }}
              .rs-formateur-qr-actions
                a.rs-formateur-link(:href='localeHref(`/formations/${slug}/stagiaire`)', target='_blank', rel='noopener')
                  v-icon.mr-2(small) mdi-eye
                  | Aperçu page stagiaires
                button.rs-formateur-copy(type='button', @click='copyStagiaireUrl')
                  v-icon.mr-2(small) mdi-content-copy
                  | Copier le lien

        v-col(cols='12', md='8', lg='4')
          v-card.rs-formateur-card(flat)
            v-card-title.rs-formateur-card-title
              v-icon.mr-2(color='primary', small) mdi-link-variant
              | Liens rapides
            v-card-text.pt-0
              a.rs-formateur-link(
                v-for='link in activeLinks'
                :key='link.id'
                :href='link.url || "#"'
                :target='link.external ? "_blank" : null'
                :rel='link.external ? "noopener" : null'
                :class='{ "rs-formateur-link--disabled": !link.url }'
                )
                v-icon.mr-2(small) {{ link.icon || 'mdi-open-in-new' }}
                span
                  strong {{ link.label }}
                  span.rs-formateur-link-hint(v-if='link.hint && !link.url') {{ link.hint }}
              p.rs-formateur-trainer.mt-3(v-if='data.trainer')
                v-icon.mr-1(small) mdi-account-tie
                | {{ data.trainer }}

        v-col(cols='12', lg='8')
          v-card.rs-formateur-card(flat)
            v-card-title.rs-formateur-card-title
              v-icon.mr-2(color='primary', small) mdi-calendar-clock
              | Planning session
            v-card-text.pt-0
              .rs-formateur-day(v-for='day in data.schedule', :key='day.day')
                h3.rs-formateur-day-label
                  span {{ day.label }}
                  button.rs-formateur-publish-day(
                    v-if='canPublish && dayHasDraft(day)'
                    type='button'
                    :disabled='publishBusy'
                    @click='publishDay(day)'
                    )
                    v-icon.mr-1(x-small) mdi-cloud-upload
                    | Publier le jour
                ul.rs-formateur-module-list
                  li.rs-formateur-module-row(
                    v-for='mod in day.modules'
                    :key='mod.stem'
                    )
                    a.rs-formateur-module-link(:href='localeHref(mod.href)')
                      span.rs-formateur-module-num {{ padNum(mod.moduleNum) }}
                      span {{ mod.title }}
                    button.rs-formateur-publish-btn(
                      v-if='canPublish && !mod.isPublished'
                      type='button'
                      :disabled='publishBusy'
                      :title='"Publier le module (exercice et correction séparément)"'
                      @click.prevent='publishModule(mod)'
                      )
                      v-icon(x-small) mdi-cloud-upload
                      span Publier
                    span.rs-formateur-badge(
                      :class='mod.isPublished ? "rs-formateur-badge--pub" : "rs-formateur-badge--draft"'
                      ) {{ mod.isPublished ? 'Publié' : 'Brouillon' }}

        v-col(cols='12', md='6')
          v-card.rs-formateur-card(flat)
            v-card-title.rs-formateur-card-title
              v-icon.mr-2(color='primary', small) mdi-download
              | Labs & téléchargements
            v-card-text.pt-0
              template(v-if='data.labs.length')
                a.rs-formateur-link(
                  v-for='lab in data.labs'
                  :key='lab.id'
                  :href='lab.url'
                  target='_blank'
                  rel='noopener'
                  )
                  v-icon.mr-2(small) mdi-folder-zip-outline
                  | {{ lab.label }}
              p.grey--text.caption(v-else) Aucun lab configuré dans meta.yaml

        v-col(cols='12', md='6')
          v-card.rs-formateur-card(flat)
            v-card-title.rs-formateur-card-title
              v-icon.mr-2(color='primary', small) mdi-account-group
              | Contacts
            v-card-text.pt-0
              .rs-formateur-contact(v-for='(c, idx) in data.contacts', :key='idx')
                strong {{ c.name }}
                .caption.grey--text {{ c.role }}
                a(v-if='c.email', :href='`mailto:${c.email}`') {{ c.email }}
                span.ml-2(v-if='c.phone') {{ c.phone }}

        v-col(cols='12', md='6', v-if='data.checklist.length')
          v-card.rs-formateur-card(flat)
            v-card-title.rs-formateur-card-title
              v-icon.mr-2(color='primary', small) mdi-checkbox-marked-circle-outline
              | Avant la session
            v-card-text.pt-0
              ul.rs-formateur-checklist
                li(v-for='(item, idx) in data.checklist', :key='idx') {{ item }}

        v-col(cols='12', md='6', v-if='data.notes')
          v-card.rs-formateur-card(flat)
            v-card-title.rs-formateur-card-title
              v-icon.mr-2(color='primary', small) mdi-information-outline
              | Notes
            v-card-text.pt-0
              pre.rs-formateur-notes {{ data.notes }}

        v-col(cols='12')
          v-card.rs-formateur-card(flat)
            v-card-title.rs-formateur-card-title
              v-icon.mr-2(color='primary', small) mdi-eye-settings
              | Publication des modules
              v-spacer
              span.caption.grey--text {{ data.publication.draft }} brouillon(s)
            v-card-text.pt-0
              .rs-formateur-pub-grid
                a.rs-formateur-pub-item(
                  v-for='mod in data.modules'
                  :key='mod.stem'
                  :href='localeHref(mod.href)'
                  :class='mod.isPublished ? "rs-formateur-pub-item--pub" : "rs-formateur-pub-item--draft"'
                  )
                  span.rs-formateur-module-num {{ padNum(mod.moduleNum) }}
                  span.rs-formateur-pub-title {{ mod.title }}
                  button.rs-formateur-publish-btn.rs-formateur-publish-btn--inline(
                    v-if='canPublish && !mod.isPublished'
                    type='button'
                    :disabled='publishBusy'
                    @click.prevent.stop='publishModule(mod)'
                    )
                    v-icon(x-small) mdi-cloud-upload
                  span.rs-formateur-badge(
                    :class='mod.isPublished ? "rs-formateur-badge--pub" : "rs-formateur-badge--draft"'
                    ) {{ mod.isPublished ? 'OK' : '—' }}
</template>

<script>
import { get } from 'vuex-pathify'

export default {
  props: {
    slug: { type: String, required: true },
    locale: { type: String, default: 'fr' }
  },
  data () {
    return {
      loading: true,
      error: '',
      data: null,
      publishBusy: false,
      useLmsApi: false
    }
  },
  computed: {
    permissions: get('user/permissions'),
    canPublish () {
      const elevated = ['manage:system', 'write:pages', 'manage:pages']
      return (this.permissions || []).some(p => elevated.includes(p))
    },
    dateRange () {
      if (!this.data || !this.data.dates) return ''
      const { start, end } = this.data.dates
      if (!start) return ''
      if (!end || end === start) return this.formatDate(start)
      return `${this.formatDate(start)} → ${this.formatDate(end)}`
    },
    activeLinks () {
      return (this.data && this.data.links) || []
    },
    convocationText () {
      if (!this.data) return ''
      const hub = `${window.location.origin}${this.localeHref(`/formations/${this.slug}/formateur`)}`
      const dates = this.dateRange || 'prochainement'
      return (
        `Bonjour,\n\n` +
        `Votre formation « ${this.data.title} » est programmée ${dates}.\n\n` +
        `Accédez à votre espace formateur : ${hub}\n\n` +
        `Merci de publier les modules avant le premier jour.\n`
      )
    }
  },
  watch: {
    slug: {
      immediate: true,
      handler () { this.load() }
    }
  },
  mounted () {
    this.$root.$on('formation-nav-refresh', this.load)
  },
  beforeDestroy () {
    this.$root.$off('formation-nav-refresh', this.load)
  },
  methods: {
    localeHref (href) {
      if (!href) return '#'
      if (href.startsWith('http') || href.startsWith('mailto:')) return href
      const path = href.startsWith('/') ? href.slice(1) : href
      return `/${this.locale}/${path}`
    },
    padNum (n) {
      return String(n).padStart(2, '0')
    },
    formatDate (iso) {
      try {
        return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
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
        const apiRes = await fetch(`/api/formation/${encodeURIComponent(this.slug)}/formateur`, {
          credentials: 'same-origin',
          cache: 'no-store'
        })
        if (apiRes.ok) {
          this.data = await apiRes.json()
          this.useLmsApi = true
          return
        }
        if (apiRes.status !== 404) {
          const errBody = await apiRes.json().catch(() => ({}))
          throw new Error(errBody.error?.message || `Erreur ${apiRes.status}`)
        }
        const legacy = await fetch(`/_assets/formateur/${encodeURIComponent(this.slug)}.json`, { cache: 'no-store' })
        if (!legacy.ok) throw new Error('Formation introuvable — distribuer via LMS ou lancer build-formation-formateur.py')
        this.data = await legacy.json()
        this.useLmsApi = false
      } catch (e) {
        this.error = e.message || String(e)
        this.data = null
      } finally {
        this.loading = false
      }
    },
    async copyStagiaireUrl () {
      if (!this.data || !this.data.stagiaireUrl) return
      try {
        await navigator.clipboard.writeText(this.data.stagiaireUrl)
        this.$store.commit('showNotification', {
          style: 'green',
          message: 'Lien stagiaires copié',
          icon: 'check'
        })
      } catch (e) {
        this.$store.commit('showNotification', {
          style: 'orange',
          message: 'Copie impossible — sélectionnez le lien manuellement',
          icon: 'alert'
        })
      }
    },
    async copyConvocationMessage () {
      if (!this.convocationText) return
      try {
        await navigator.clipboard.writeText(this.convocationText)
        this.$store.commit('showNotification', {
          style: 'green',
          message: 'Message convocation copié',
          icon: 'check'
        })
      } catch (e) {
        this.$store.commit('showNotification', {
          style: 'orange',
          message: 'Copie impossible',
          icon: 'alert'
        })
      }
    },
    dayHasDraft (day) {
      return (day.modules || []).some(mod => !mod.isPublished)
    },
    async publishViaLms (body) {
      const res = await fetch(`/api/formation/${encodeURIComponent(this.slug)}/publish`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || `Publication échouée (${res.status})`)
      }
      return json
    },
    async publishModule (mod) {
      if (!this.canPublish || this.publishBusy || !mod || mod.isPublished) return
      this.publishBusy = true
      try {
        if (this.useLmsApi) {
          const result = await this.publishViaLms({ action: 'module', path: mod.stem })
          await this.load()
          this.$root.$emit('formation-nav-refresh')
          this.$root.$emit('formation-nav-assets-refresh')
          this.$store.commit('showNotification', {
            style: 'green',
            message: `Module publié (${result.count || 1})`,
            icon: 'check'
          })
          return
        }
        this.$store.commit('showNotification', {
          style: 'orange',
          message: 'Publication legacy — migrer la session vers LMS',
          icon: 'alert'
        })
      } catch (e) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: e.message || 'Échec publication',
          icon: 'alert'
        })
      } finally {
        this.publishBusy = false
      }
    },
    async publishDay (day) {
      if (!this.canPublish || this.publishBusy || !day) return
      const targets = (day.modules || []).filter(mod => !mod.isPublished)
      if (!targets.length) return
      this.publishBusy = true
      try {
        if (this.useLmsApi) {
          const result = await this.publishViaLms({ action: 'day', day: day.day })
          await this.load()
          this.$root.$emit('formation-nav-refresh')
          this.$root.$emit('formation-nav-assets-refresh')
          this.$store.commit('showNotification', {
            style: 'green',
            message: `Jour publié (${result.count || targets.length} module(s))`,
            icon: 'check'
          })
          return
        }
        this.$store.commit('showNotification', {
          style: 'orange',
          message: 'Publication legacy — migrer la session vers LMS',
          icon: 'alert'
        })
      } catch (e) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: e.message || 'Échec publication',
          icon: 'alert'
        })
      } finally {
        this.publishBusy = false
      }
    }
  }
}
</script>
