<template lang="pug">
  v-dialog.rs-module-editor(v-model='open', max-width='980', scrollable, persistent, content-class='rs-module-editor-dialog')
    v-card.rs-module-editor-card
      .rs-module-editor-header
        .rs-module-editor-header-main
          .rs-module-editor-kicker Édition module
          h2.rs-module-editor-heading {{ activeTitle }}
          code.rs-module-editor-path {{ activePath }}
        v-btn.rs-module-editor-close(icon, :disabled='saving', @click='requestClose')
          v-icon mdi-close
      v-progress-linear(v-if='loading || saving', indeterminate, color='primary', height='3')
      v-card-text.rs-module-editor-body
        v-alert.mb-3(v-if='error', type='error', dense, outlined) {{ error }}
        v-tabs.rs-module-editor-tabs(v-model='tab', grow, background-color='transparent', slider-color='primary')
          v-tab
            v-icon.mr-2(small) mdi-language-markdown
            | Édition
          v-tab
            v-icon.mr-2(small) mdi-eye-outline
            | Aperçu
        v-tabs-items.rs-module-editor-panels(v-model='tab')
          v-tab-item
            v-textarea.rs-module-editor-textarea(
              v-model='bodyMd'
              outlined
              auto-grow
              rows='20'
              hide-details
              :disabled='loading || saving'
              placeholder='Contenu Markdown…'
              )
          v-tab-item
            .rs-module-editor-preview.contents(v-if='bodyMd', v-html='previewHtml')
            .rs-module-editor-preview-empty(v-else)
              v-icon(large, color='grey lighten-1') mdi-text-box-outline
              p Aucun contenu — commencez à écrire dans l'onglet Édition.
      v-card-actions.rs-module-editor-footer
        .rs-module-editor-meta
          span.rs-module-editor-version(v-if='currentVersion')
            v-icon.mr-1(x-small) mdi-source-branch
            | Version {{ currentVersion }}
          span.rs-module-editor-dirty(v-if='dirty') Modifications non enregistrées
        v-spacer
        v-btn(text, :disabled='saving', @click='requestClose') Annuler
        v-btn(
          color='primary'
          depressed
          :loading='saving'
          :disabled='loading || !dirty'
          @click='save'
          )
          v-icon(left, small) mdi-content-save-outline
          | Enregistrer
</template>

<script>
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

export default {
  props: {
    slug: { type: String, required: true }
  },
  data () {
    return {
      open: false,
      tab: 0,
      loading: false,
      saving: false,
      error: '',
      bodyMd: '',
      initialBody: '',
      currentVersion: null,
      activeStem: '',
      activeTitle: ''
    }
  },
  computed: {
    activePath () {
      const stem = String(this.activeStem || '').replace(/\.md$/, '')
      return stem ? `${stem}.md` : ''
    },
    previewHtml () {
      try {
        return md.render(this.bodyMd || '')
      } catch (e) {
        return '<p>Aperçu indisponible.</p>'
      }
    },
    dirty () {
      return this.bodyMd !== this.initialBody
    }
  },
  methods: {
    async openFor (mod) {
      if (!mod || !mod.stem) return
      this.activeStem = mod.stem
      this.activeTitle = mod.title || mod.stem
      this.error = ''
      this.tab = 0
      this.open = true
      await this.load()
    },
    requestClose () {
      if (this.dirty && !window.confirm('Modifications non enregistrées — fermer quand même ?')) return
      this.open = false
    },
    async load () {
      if (!this.slug || !this.activeStem) return
      this.loading = true
      this.error = ''
      try {
        const res = await fetch(
          `/api/formation/${encodeURIComponent(this.slug)}/content/module?path=${encodeURIComponent(this.activeStem)}`,
          { credentials: 'same-origin', cache: 'no-store' }
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error?.message || `Erreur ${res.status}`)
        this.bodyMd = json.body_md || ''
        this.initialBody = this.bodyMd
        this.currentVersion = json.current_version
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.loading = false
      }
    },
    async save () {
      if (!this.dirty || this.saving) return
      this.saving = true
      this.error = ''
      try {
        const res = await fetch(`/api/formation/${encodeURIComponent(this.slug)}/content/module`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: this.activeStem, body_md: this.bodyMd })
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error?.message || `Erreur ${res.status}`)
        this.initialBody = this.bodyMd
        this.currentVersion = json.version || json.current_version || this.currentVersion
        this.$store.commit('showNotification', {
          style: 'green',
          message: json.unchanged ? 'Aucun changement' : `Module enregistré (v${this.currentVersion})`,
          icon: 'check'
        })
        this.$emit('saved', { stem: this.activeStem, version: this.currentVersion })
        this.open = false
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
