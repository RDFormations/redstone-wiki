<template lang="pug">
  .rs-module-edit-page
    .rs-module-edit-page-toolbar
      v-btn(text, small, :to='formateurHref', exact)
        v-icon(left, small) mdi-arrow-left
        | Cockpit formateur
      .rs-module-edit-page-title
        h1 {{ title || moduleStem || 'Édition' }}
        code(v-if='moduleStem') {{ moduleStem }}.md
      v-spacer
      v-btn(
        color='primary'
        depressed
        :loading='saving'
        :disabled='loading || !dirty'
        @click='save'
        )
        v-icon(left, small) mdi-content-save-outline
        | Enregistrer
    v-progress-linear(v-if='loading || saving', indeterminate, color='primary', height='3')
    v-alert.ma-3(v-if='error', type='error', dense, outlined) {{ error }}
    v-alert.ma-3(v-if='!moduleStem', type='info', dense, outlined)
      | Choisissez un module depuis le cockpit formateur (route
      code.mx-1 /formations/{{ slug }}/edit/&#123;module&#125;
      | ).
    template(v-else)
      v-row.rs-module-edit-page-grid(dense, no-gutters)
        v-col(cols='12', md='7')
          v-tabs(v-model='tab', background-color='transparent', slider-color='primary')
            v-tab Édition
            v-tab Aperçu
          v-tabs-items(v-model='tab')
            v-tab-item
              v-textarea.rs-module-edit-page-textarea(
                v-model='bodyMd'
                outlined
                auto-grow
                rows='24'
                hide-details
                :disabled='loading || saving'
                )
            v-tab-item
              .rs-module-edit-page-preview.contents(ref='preview', v-html='previewHtml')
        v-col(cols='12', md='5')
          formation-module-chatbot(
            :slug='slug'
            :path='moduleStem'
            :body-md='bodyMd'
            @applied='onChatApplied'
            )
</template>

<script>
import MarkdownIt from 'markdown-it'
import { enhanceMermaidDiagrams } from '../../helpers/mermaid.js'
import FormationModuleChatbot from './formation-module-chatbot.vue'

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

export default {
  components: { FormationModuleChatbot },
  props: {
    slug: { type: String, required: true },
    moduleStem: { type: String, default: '' },
    locale: { type: String, default: 'fr' }
  },
  data () {
    return {
      tab: 0,
      loading: false,
      saving: false,
      error: '',
      bodyMd: '',
      initialBody: '',
      title: '',
      currentVersion: null
    }
  },
  computed: {
    formateurHref () {
      return `/${this.locale}/formations/${this.slug}/formateur`
    },
    dirty () {
      return this.bodyMd !== this.initialBody
    },
    previewHtml () {
      try {
        return md.render(this.bodyMd || '')
      } catch (e) {
        return '<p>Aperçu indisponible.</p>'
      }
    }
  },
  watch: {
    moduleStem: {
      immediate: true,
      handler (stem) {
        if (stem) this.load()
      }
    },
    tab (value) {
      if (value === 1) this.$nextTick(() => this.enhancePreview())
    },
    bodyMd () {
      if (this.tab === 1) this.$nextTick(() => this.enhancePreview())
    }
  },
  methods: {
    enhancePreview () {
      const root = this.$refs.preview
      if (!root) return
      enhanceMermaidDiagrams(root, { isDark: Boolean(this.$vuetify?.theme?.dark) })
    },
    async load () {
      if (!this.slug || !this.moduleStem) return
      this.loading = true
      this.error = ''
      try {
        const res = await fetch(
          `/api/formation/${encodeURIComponent(this.slug)}/content/module?path=${encodeURIComponent(this.moduleStem)}`,
          { credentials: 'same-origin', cache: 'no-store' }
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error?.message || `Erreur ${res.status}`)
        this.bodyMd = json.body_md || ''
        this.initialBody = this.bodyMd
        this.title = json.title || this.moduleStem
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
          body: JSON.stringify({ path: this.moduleStem, body_md: this.bodyMd })
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error?.message || `Erreur ${res.status}`)
        this.initialBody = this.bodyMd
        this.currentVersion = json.version || this.currentVersion
        this.$store.commit('showNotification', {
          style: 'green',
          message: `Module enregistré (v${this.currentVersion})`,
          icon: 'check'
        })
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.saving = false
      }
    },
    onChatApplied ({ body_md, version }) {
      if (body_md != null) {
        this.bodyMd = body_md
        this.initialBody = body_md
      }
      if (version) this.currentVersion = version
    }
  }
}
</script>

<style scoped>
.rs-module-edit-page {
  min-height: 70vh;
  padding: 12px 16px 32px;
}
.rs-module-edit-page-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.rs-module-edit-page-title h1 {
  font-size: 1.25rem;
  margin: 0;
}
.rs-module-edit-page-textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.rs-module-edit-page-preview {
  min-height: 320px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
}
.rs-module-edit-page-grid {
  margin-top: 8px;
}
</style>
