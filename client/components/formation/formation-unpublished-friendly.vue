<template lang="pug">
  .rs-unpublished-friendly
    v-icon.rs-unpublished-icon(color='primary', large) mdi-clock-outline
    h2.rs-unpublished-title Module pas encore disponible
    p.rs-unpublished-text
      | Ce module sera disponible le matin de la session.
      | En attendant, consultez les modules déjà accessibles depuis la page liens session.
    .rs-unpublished-actions
      a.rs-unpublished-link(:href='hubHref')
        v-icon.mr-2(small) mdi-home
        | Retour aux liens session
      a.rs-unpublished-link(v-if='supportHref', :href='supportHref')
        v-icon.mr-2(small) mdi-book-open-page-variant
        | Support de cours
</template>

<script>
export default {
  props: {
    slug: { type: String, required: true },
    locale: { type: String, default: 'fr' }
  },
  computed: {
    hubHref () {
      return `/${this.locale}/formations/${this.slug}/stagiaire`
    },
    supportHref () {
      return `/${this.locale}/formations/${this.slug}`
    }
  }
}
</script>
