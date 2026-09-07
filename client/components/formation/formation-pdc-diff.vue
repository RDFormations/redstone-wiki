<template lang="pug">
  .rs-pdc-diff
    v-alert.mb-2(v-if='error', type='error', dense, outlined) {{ error }}
    v-progress-linear(v-if='loading', indeterminate, color='primary', height='3')
    template(v-else-if='data')
      .rs-pdc-diff-meta.mb-2(v-if='data.client || data.improved')
        span.caption.grey--text
          | client v{{ (data.client && data.client.version) || '?' }}
          |  → improved v{{ (data.improved && data.improved.version) || '?' }}
      .rs-pdc-diff-summary(v-if='data.summary')
        span.is-add +{{ data.summary.added }}
        span.mx-2.is-remove −{{ data.summary.removed }}
        span.is-same ={{ data.summary.unchanged }}
      pre.rs-pdc-diff-body
        div(
          v-for='(hunk, idx) in visibleHunks'
          :key='idx'
          :class='hunkClass(hunk)'
          ) {{ prefix(hunk) }}{{ hunk.line }}
      .caption.grey--text.mt-1(v-if='truncated') Affichage limité aux 200 premières lignes.
    v-alert(v-else-if='!loading && !error', type='info', dense, outlined)
      | Importez un PDC client et improved (API C04) pour afficher le diff.
</template>

<script>
export default {
  props: {
    sessionId: { type: String, required: true }
  },
  data () {
    return { loading: false, error: '', data: null }
  },
  computed: {
    visibleHunks () {
      return (this.data && this.data.diff ? this.data.diff : []).slice(0, 200)
    },
    truncated () {
      return this.data && Array.isArray(this.data.diff) && this.data.diff.length > 200
    }
  },
  watch: {
    sessionId: { immediate: true, handler () { this.load() } }
  },
  methods: {
    hunkClass (h) {
      if (h.type === 'add') return 'is-add'
      if (h.type === 'remove') return 'is-remove'
      return 'is-same'
    },
    prefix (h) {
      if (h.type === 'add') return '+ '
      if (h.type === 'remove') return '- '
      return '  '
    },
    async load () {
      if (!this.sessionId) return
      this.loading = true
      this.error = ''
      this.data = null
      try {
        const res = await fetch(`/api/admin/sessions/${this.sessionId}/pdc/diff`, {
          credentials: 'same-origin'
        })
        const json = await res.json().catch(() => ({}))
        if (res.status === 404) {
          // Pas encore de couple client/improved — message info, pas d'erreur rouge
          return
        }
        if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`)
        this.data = json
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.rs-pdc-diff-summary { font-family: ui-monospace, monospace; font-size: 12px; }
.rs-pdc-diff-summary .is-add { color: #15803d; }
.rs-pdc-diff-summary .is-remove { color: #b91c1c; }
.rs-pdc-diff-body {
  max-height: 320px;
  overflow: auto;
  background: #0f172a;
  color: #e2e8f0;
  padding: 8px;
  font-size: 12px;
  border-radius: 6px;
}
.rs-pdc-diff-body .is-add { color: #86efac; }
.rs-pdc-diff-body .is-remove { color: #fca5a5; }
.rs-pdc-diff-body .is-same { opacity: 0.5; }
</style>
