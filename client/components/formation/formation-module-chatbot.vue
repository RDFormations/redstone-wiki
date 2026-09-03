<template lang="pug">
  .rs-module-chatbot
    .rs-module-chatbot-header
      v-icon.mr-2(small, color='primary') mdi-robot-outline
      span Assistant édition
      v-spacer
      span.rs-module-chatbot-hint Diff → Appliquer (obligatoire)
    .rs-module-chatbot-messages(ref='messages')
      .rs-module-chatbot-empty(v-if='!messages.length && !proposal')
        p Décrivez la modification souhaitée. L'assistant propose un diff — rien n'est écrit sans votre clic Appliquer.
      .rs-module-chatbot-msg(
        v-for='(m, idx) in messages'
        :key='idx'
        :class='m.role === "user" ? "is-user" : "is-assistant"'
        )
        strong {{ m.role === 'user' ? 'Vous' : 'Assistant' }}
        p {{ m.text }}
    .rs-module-chatbot-proposal(v-if='proposal')
      .rs-module-chatbot-proposal-meta
        span {{ proposal.summary || 'Proposition' }}
        span.rs-module-chatbot-stats(v-if='proposal.summary_diff')
          | +{{ proposal.summary_diff.added }} / −{{ proposal.summary_diff.removed }}
      pre.rs-module-chatbot-diff
        div(
          v-for='(hunk, idx) in (proposal.diff || []).slice(0, 80)'
          :key='idx'
          :class='hunkClass(hunk)'
          ) {{ hunkPrefix(hunk) }}{{ hunk.line }}
      .rs-module-chatbot-actions
        v-btn(text, small, :disabled='busy', @click='discard') Refuser
        v-btn(
          color='primary'
          small
          depressed
          :loading='applying'
          :disabled='busy'
          @click='apply'
          )
          v-icon(left, x-small) mdi-check
          | Appliquer
    .rs-module-chatbot-compose
      v-textarea(
        v-model='draft'
        outlined
        dense
        hide-details
        rows='2'
        auto-grow
        :disabled='busy'
        placeholder='Ex. ajoute une section exercices'
        @keydown.ctrl.enter='propose'
        )
      v-btn(
        color='primary'
        depressed
        class='ml-2'
        :loading='proposing'
        :disabled='busy || !draft.trim()'
        @click='propose'
        )
        v-icon(left, small) mdi-send
        | Proposer
    v-alert.mt-2(v-if='error', type='error', dense, outlined) {{ error }}
</template>

<script>
export default {
  props: {
    slug: { type: String, required: true },
    path: { type: String, required: true },
    bodyMd: { type: String, default: '' }
  },
  data () {
    return {
      draft: '',
      messages: [],
      proposal: null,
      proposing: false,
      applying: false,
      error: ''
    }
  },
  computed: {
    busy () {
      return this.proposing || this.applying
    }
  },
  methods: {
    hunkClass (hunk) {
      if (hunk.type === 'add') return 'is-add'
      if (hunk.type === 'remove') return 'is-remove'
      return 'is-same'
    },
    hunkPrefix (hunk) {
      if (hunk.type === 'add') return '+ '
      if (hunk.type === 'remove') return '- '
      return '  '
    },
    async propose () {
      const message = this.draft.trim()
      if (!message || this.busy) return
      this.proposing = true
      this.error = ''
      this.messages.push({ role: 'user', text: message })
      this.draft = ''
      try {
        const res = await fetch(`/api/formation/${encodeURIComponent(this.slug)}/content/chatbot/propose`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: this.path, message })
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error?.message || `Erreur ${res.status}`)
        this.proposal = json
        this.messages.push({
          role: 'assistant',
          text: json.summary || 'Proposition prête — examinez le diff puis Appliquer.'
        })
        this.$nextTick(() => {
          const el = this.$refs.messages
          if (el) el.scrollTop = el.scrollHeight
        })
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.proposing = false
      }
    },
    async apply () {
      if (!this.proposal?.proposal_id || this.busy) return
      this.applying = true
      this.error = ''
      try {
        const res = await fetch(`/api/formation/${encodeURIComponent(this.slug)}/content/chatbot/apply`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposal_id: this.proposal.proposal_id })
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error?.message || `Erreur ${res.status}`)
        this.$emit('applied', {
          body_md: this.proposal.proposed_body_md,
          version: json.version,
          chat_message_id: json.chat_message_id
        })
        this.$store.commit('showNotification', {
          style: 'green',
          message: `Modification chatbot appliquée (v${json.version})`,
          icon: 'check'
        })
        this.proposal = null
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.applying = false
      }
    },
    discard () {
      this.proposal = null
      this.messages.push({ role: 'assistant', text: 'Proposition refusée — le module est inchangé.' })
    }
  }
}
</script>

<style scoped>
.rs-module-chatbot {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  padding-top: 12px;
  margin-top: 8px;
}
.rs-module-chatbot-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  margin-bottom: 8px;
}
.rs-module-chatbot-hint {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.7;
}
.rs-module-chatbot-messages {
  max-height: 160px;
  overflow: auto;
  margin-bottom: 8px;
}
.rs-module-chatbot-msg {
  padding: 6px 8px;
  border-radius: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}
.rs-module-chatbot-msg.is-user {
  background: rgba(25, 118, 210, 0.08);
}
.rs-module-chatbot-msg.is-assistant {
  background: rgba(0, 0, 0, 0.04);
}
.rs-module-chatbot-proposal {
  border: 1px solid rgba(25, 118, 210, 0.25);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
}
.rs-module-chatbot-diff {
  max-height: 200px;
  overflow: auto;
  font-size: 12px;
  background: #0f172a;
  color: #e2e8f0;
  padding: 8px;
  border-radius: 6px;
}
.rs-module-chatbot-diff .is-add { color: #86efac; }
.rs-module-chatbot-diff .is-remove { color: #fca5a5; }
.rs-module-chatbot-diff .is-same { opacity: 0.55; }
.rs-module-chatbot-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.rs-module-chatbot-compose {
  display: flex;
  align-items: flex-end;
}
.rs-module-chatbot-empty {
  font-size: 13px;
  opacity: 0.7;
}
</style>
