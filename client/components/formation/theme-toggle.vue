<template lang="pug">
  button.rs-theme-toggle(type='button', @click='toggle', :aria-label='label')
    span.rs-theme-toggle__icon {{ icon }}
    span.rs-theme-toggle__text {{ label }}
</template>

<script>
const STORAGE_KEY = 'rs-theme'

export default {
  computed: {
    isDark () {
      return this.$vuetify.theme.dark
    },
    icon () {
      return this.isDark ? '☀' : '☾'
    },
    label () {
      return this.isDark ? 'Clair' : 'Sombre'
    }
  },
  mounted () {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'dark') this.$vuetify.theme.dark = true
      if (saved === 'light') this.$vuetify.theme.dark = false
    } catch (e) {}
    document.documentElement.setAttribute('data-rs-theme', this.isDark ? 'dark' : 'light')
  },
  methods: {
    toggle () {
      this.$vuetify.theme.dark = !this.$vuetify.theme.dark
      try {
        localStorage.setItem(STORAGE_KEY, this.isDark ? 'dark' : 'light')
      } catch (e) {}
      document.documentElement.setAttribute('data-rs-theme', this.isDark ? 'dark' : 'light')
    }
  }
}
</script>

<style lang="scss" scoped>
.rs-theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.35);
  }

  &__icon {
    font-size: 14px;
    line-height: 1;
  }
}
</style>
