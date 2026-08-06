<template lang="pug">
  v-dialog.rs-module-versions(v-model='open', max-width='900', scrollable)
    v-card
      v-card-title
        v-icon.mr-2(small, color='primary') mdi-history
        | Historique — {{ activeTitle }}
        v-spacer
        v-btn(icon, small, @click='open = false')
          v-icon mdi-close
      v-card-subtitle.caption {{ activePath }}
      v-progress-linear(v-if='loading', indeterminate, color='primary', height='2')
      v-card-text.pt-0
        v-alert.mb-3(v-if='error', type='error', dense, outlined) {{ error }}
        v-row(dense)
          v-col(cols='12', md='4')
            .rs-module-versions-filter.mb-2
              v-select(
                v-model='sourceFilter'
                :items='sourceOptions'
                dense
                outlined
                hide-details
                label='Filtrer par source'
                )
            ul.rs-module-versions-timeline
              li.rs-module-versions-item(
                v-for='ver in filteredVersions'
                :key='ver.id'
                :class='{ "rs-module-versions-item--active": selectedId === ver.id }'
                @click='selectVersion(ver)'
                )
                .rs-module-versions-item-head
                  strong v{{ ver.version }}
                  span.rs-module-versions-source(:class='sourceClass(ver.source)') {{ sourceLabel(ver.source) }}
                .caption.grey--text {{ formatDate(ver.created_at) }}
                .caption(v-if='ver.author') {{ ver.author }}
          v-col(cols='12', md='8')
            v-progress-linear(v-if='diffLoading', indeterminate, color='primary', height='2')
            template(v-if='diff')
              .rs-module-versions-summary.mb-2
                span.mr-3 +{{ diff.summary.added }}
                span.mr-3 -{{ diff.summary.removed }}
                span {{ diff.summary.unchanged }} inchangées
              pre.rs-module-versions-diff
                div(
                  v-for='(hunk, idx) in diff.diff'
                  :key='idx'
                  :class='hunkClass(hunk)'
                  ) {{ hunkPrefix(hunk) }}{{ hunk.line }}
            p.grey--text.caption(v-else-if='!diffLoading') Sélectionnez une version pour voir le diff.
</template>

<script>
const SOURCE_LABELS = {
  agent_pipeline: 'Agent',
  ui_edit: 'Édition UI',
  chatbot: 'Chatbot',
  import_file: 'Import',
  e2e: 'E2E'
}

export default {
  props: {
    slug: { type: String, required: true }
  },
  data () {
    return {
      open: false,
      loading: false,
      diffLoading: false,
      error: '',
      versions: [],
      currentVersion: null,
      selectedId: null,
      diff: null,
      sourceFilter: 'all',
      activeStem: '',
      activeTitle: ''
    }
  },
  computed: {
    activePath () {
      const stem = String(this.activeStem || '').replace(/\.md$/, '')
      return stem ? `${stem}.md` : ''
    },
    sourceOptions () {
      const sources = [...new Set(this.versions.map(v => v.source).filter(Boolean))]
      return [
        { text: 'Toutes les sources', value: 'all' },
        ...sources.map(s => ({ text: SOURCE_LABELS[s] || s, value: s }))
      ]
    },
    filteredVersions () {
      if (this.sourceFilter === 'all') return this.versions
      return this.versions.filter(v => v.source === this.sourceFilter)
    }
  },
  methods: {
    async openFor (mod) {
      if (!mod || !mod.stem) return
      this.activeStem = mod.stem
      this.activeTitle = mod.title || mod.stem
      this.error = ''
      this.diff = null
      this.selectedId = null
      this.sourceFilter = 'all'
      this.open = true
      await this.loadVersions()
    },
    async loadVersions () {
      this.loading = true
      this.error = ''
      try {
        const res = await fetch(
          `/api/formation/${encodeURIComponent(this.slug)}/content/versions?path=${encodeURIComponent(this.activeStem)}`,
          { credentials: 'same-origin', cache: 'no-store' }
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error?.message || `Erreur ${res.status}`)
        this.versions = json.versions || []
        this.currentVersion = json.current_version
        if (this.versions.length) {
          await this.selectVersion(this.versions[0])
        }
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.loading = false
      }
    },
    async selectVersion (ver) {
      if (!ver) return
      this.selectedId = ver.id
      this.diffLoading = true
      this.diff = null
      try {
        const res = await fetch(
          `/api/formation/${encodeURIComponent(this.slug)}/content/versions/${encodeURIComponent(ver.id)}/diff`,
          { credentials: 'same-origin', cache: 'no-store' }
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error?.message || `Erreur ${res.status}`)
        this.diff = json
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.diffLoading = false
      }
    },
    sourceLabel (source) {
      return SOURCE_LABELS[source] || source || '—'
    },
    sourceClass (source) {
      return `rs-module-versions-source--${String(source || 'unknown').replace(/[^a-z0-9_-]/gi, '-')}`
    },
    formatDate (iso) {
      if (!iso) return ''
      try {
        return new Date(iso).toLocaleString('fr-FR')
      } catch (e) {
        return iso
      }
    },
    hunkClass (hunk) {
      return `rs-module-versions-hunk--${hunk.type}`
    },
    hunkPrefix (hunk) {
      if (hunk.type === 'add') return '+ '
      if (hunk.type === 'remove') return '- '
      return '  '
    }
  }
}
</script>
