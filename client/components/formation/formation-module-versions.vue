<template lang="pug">
  v-dialog.rs-module-versions(v-model='open', max-width='960', scrollable, content-class='rs-module-versions-dialog')
    v-card.rs-module-versions-card
      .rs-module-versions-header
        .rs-module-versions-header-main
          .rs-module-versions-kicker Historique
          h2.rs-module-versions-heading {{ activeTitle }}
          code.rs-module-versions-path {{ activePath }}
          span.rs-module-versions-current(v-if='currentVersion') v{{ currentVersion }} actuelle
        v-btn.rs-module-versions-close(icon, @click='open = false')
          v-icon mdi-close
      v-progress-linear(v-if='loading', indeterminate, color='primary', height='3')
      v-card-text.rs-module-versions-body
        v-alert.mb-3(v-if='error', type='error', dense, outlined) {{ error }}
        v-row(dense)
          v-col(cols='12', md='4')
            .rs-module-versions-sidebar
              v-select.rs-module-versions-filter(
                v-model='sourceFilter'
                :items='sourceOptions'
                dense
                outlined
                hide-details
                prepend-inner-icon='mdi-filter-variant'
                label='Filtrer par source'
                )
              .rs-module-versions-empty(v-if='!loading && !filteredVersions.length')
                v-icon(color='grey') mdi-history
                p Aucune version pour ce filtre.
              ul.rs-module-versions-timeline(v-else)
                li.rs-module-versions-item(
                  v-for='(ver, idx) in filteredVersions'
                  :key='ver.id'
                  :class='versionItemClass(ver, idx)'
                  @click='selectVersion(ver)'
                  )
                  .rs-module-versions-item-dot
                  .rs-module-versions-item-body
                    .rs-module-versions-item-head
                      strong v{{ ver.version }}
                      span.rs-module-versions-source(:class='sourceClass(ver.source)') {{ sourceLabel(ver.source) }}
                      span.rs-module-versions-current-badge(v-if='ver.version === currentVersion') actuelle
                    .rs-module-versions-item-date {{ formatDate(ver.created_at) }}
                    .rs-module-versions-item-author(v-if='ver.author') {{ ver.author }}
          v-col(cols='12', md='8')
            .rs-module-versions-diff-panel
              v-progress-linear(v-if='diffLoading', indeterminate, color='primary', height='2')
              template(v-if='diff')
                .rs-module-versions-summary
                  .rs-module-versions-chip.rs-module-versions-chip--add
                    v-icon.mr-1(x-small) mdi-plus
                    | {{ diff.summary.added }} ajoutées
                  .rs-module-versions-chip.rs-module-versions-chip--remove
                    v-icon.mr-1(x-small) mdi-minus
                    | {{ diff.summary.removed }} supprimées
                  .rs-module-versions-chip.rs-module-versions-chip--same
                    v-icon.mr-1(x-small) mdi-equal
                    | {{ diff.summary.unchanged }} inchangées
                pre.rs-module-versions-diff
                  div(
                    v-for='(hunk, idx) in diff.diff'
                    :key='idx'
                    :class='hunkClass(hunk)'
                    ) {{ hunkPrefix(hunk) }}{{ hunk.line }}
              .rs-module-versions-diff-empty(v-else-if='!diffLoading')
                v-icon(large, color='grey lighten-1') mdi-file-compare
                p Sélectionnez une version pour comparer avec l'actuelle.
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
    versionItemClass (ver, idx) {
      return {
        'rs-module-versions-item--active': this.selectedId === ver.id,
        'rs-module-versions-item--current': ver.version === this.currentVersion,
        'rs-module-versions-item--last': idx === this.filteredVersions.length - 1
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
