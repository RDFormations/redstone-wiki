<template lang="pug">
  v-app(v-scroll='upBtnScroll', :dark='$vuetify.theme.dark', :class='appRootClasses')
    nav-header(v-if='!printView')
    v-navigation-drawer(
      v-if='navMode !== `NONE` && !printView'
      :class='formationDrawerClass'
      dark
      app
      clipped
      mobile-breakpoint='600'
      :temporary='$vuetify.breakpoint.smAndDown'
      v-model='navShown'
      :right='$vuetify.rtl'
      )
      .rs-drawer-scroll(v-if='isFormationPage && isMobile')
        formation-nav-sidebar(:slug='formationSlug', @navigate='closeMobileNav')
      vue-scroll(v-else-if='isFormationPage', :ops='scrollStyle')
        formation-nav-sidebar(:slug='formationSlug', @navigate='closeMobileNav')
      vue-scroll(v-else, :ops='scrollStyle')
        nav-sidebar(:color='$vuetify.theme.dark ? `grey darken-4-d4` : `primary`', :items='sidebarDecoded', :nav-mode='navMode')
    button.rs-sidebar-collapse#rs-sidebar-collapse(
      v-if='isFormationPage && isDesktop && !sidebarCollapsed'
      type='button'
      title='Réduire le menu'
      @click='setSidebarCollapsed(true)'
      )
      span(aria-hidden='true') ‹
    button.rs-sidebar-expand#rs-sidebar-expand(
      v-if='isFormationPage && isDesktop && sidebarCollapsed'
      type='button'
      title='Ouvrir le menu'
      @click='setSidebarCollapsed(false)'
      )
      span(aria-hidden='true') ☰
      span Menu cours

    v-fab-transition(v-if='navMode !== `NONE` && showDefaultMobileFab')
      v-btn(
        fab
        color='primary'
        fixed
        bottom
        :right='$vuetify.rtl'
        :left='!$vuetify.rtl'
        small
        @click='navShown = !navShown'
        v-if='isMobile'
        v-show='!navShown'
        )
        v-icon mdi-menu

    v-fab-transition(v-if='isFormationPage && isMobile')
      v-btn.rs-mobile-nav-btn(
        fixed
        bottom
        :left='!$vuetify.rtl'
        :right='$vuetify.rtl'
        depressed
        rounded
        color='#210051'
        dark
        @click='openMobileNav'
        v-show='!navShown'
        )
        v-icon(left, small) mdi-menu
        span Menu cours

    v-main(ref='content')
      template(v-if='path !== `home`')
        v-toolbar(:color='$vuetify.theme.dark ? `grey darken-4-d3` : `grey lighten-3`', flat, dense, v-if='$vuetify.breakpoint.smAndUp')
          //- v-btn.pl-0(v-if='$vuetify.breakpoint.xsOnly', flat, @click='toggleNavigation')
          //-   v-icon(color='grey darken-2', left) menu
          //-   span Navigation
          v-breadcrumbs.breadcrumbs-nav.pl-0(
            :items='breadcrumbs'
            divider='/'
            )
            template(slot='item', slot-scope='props')
              v-icon(v-if='props.item.path === "/"', small, @click='goHome') mdi-home
              v-btn.ma-0(v-else, :href='props.item.path', small, text) {{props.item.name}}
          template(v-if='canTogglePublish && isFormationPage')
            v-spacer
            button.rs-publish-toggle(
              type='button'
              :disabled='publishBusy'
              :title='displayPublished ? "Dépublier la page" : "Publier la page"'
              @click='togglePublish'
              )
              span.caption(:class='displayPublished ? "green--text" : "red--text"')
                | {{ displayPublished ? 'Publié' : $t('common:page.unpublished') }}
              status-indicator.ml-3(
                :positive='displayPublished'
                :negative='!displayPublished'
                :pulse='!displayPublished'
                )
          template(v-else-if='!displayPublished')
            v-spacer
            .caption.red--text {{$t('common:page.unpublished')}}
            status-indicator.ml-3(negative, pulse)
        v-divider
      v-container.grey.pa-0(fluid, :class='$vuetify.theme.dark ? `darken-4-l3` : `lighten-4`')
        v-row.page-header-section(no-gutters, align-content='center', style='height: 90px;')
          v-col.page-col-content.is-page-header(
            :offset-xl='tocPosition === `left` ? 2 : 0'
            :offset-lg='tocPosition === `left` ? 3 : 0'
            :xl='tocPosition === `right` ? 10 : false'
            :lg='tocPosition === `right` ? 9 : false'
            style='margin-top: auto; margin-bottom: auto;'
            :class='$vuetify.rtl ? `pr-4` : `pl-4`'
            )
            .page-header-headings
              .headline.grey--text(:class='$vuetify.theme.dark ? `text--lighten-2` : `text--darken-3`') {{title}}
              .caption.grey--text.text--darken-1 {{description}}
            .page-edit-shortcuts(
              v-if='editShortcutsObj.editMenuBar'
              :class='tocPosition === `right` ? `is-right` : ``'
              )
              v-btn(
                v-if='editShortcutsObj.editMenuBtn'
                @click='pageEdit'
                depressed
                small
                )
                v-icon.mr-2(small) mdi-pencil
                span.text-none {{$t(`common:actions.edit`)}}
              v-btn(
                v-if='editShortcutsObj.editMenuExternalBtn'
                :href='editMenuExternalUrl'
                target='_blank'
                depressed
                small
                )
                v-icon.mr-2(small) {{ editShortcutsObj.editMenuExternalIcon }}
                span.text-none {{$t(`common:page.editExternal`, { name: editShortcutsObj.editMenuExternalName })}}
      v-divider
      v-container.pl-5.pt-4(fluid, grid-list-xl)
        v-layout(row)
          v-flex.page-col-sd(
            v-if='tocPosition !== `off` && $vuetify.breakpoint.lgAndUp'
            :order-xs1='tocPosition !== `right`'
            :order-xs2='tocPosition === `right`'
            lg3
            xl2
            )
            v-card.page-toc-card.mb-5(v-if='tocDecoded.length')
              .overline.pa-5.pb-0(:class='$vuetify.theme.dark ? `blue--text text--lighten-2` : `primary--text`') {{$t('common:page.toc')}}
              v-list.pb-3(dense, nav, :class='$vuetify.theme.dark ? `darken-3-d3` : ``')
                template(v-for='(tocItem, tocIdx) in tocDecoded')
                  v-list-item(@click='$vuetify.goTo(tocItem.anchor, scrollOpts)')
                    v-icon(color='grey', small) {{ $vuetify.rtl ? `mdi-chevron-left` : `mdi-chevron-right` }}
                    v-list-item-title.px-3 {{tocItem.title}}
                  //- v-divider(v-if='tocIdx < toc.length - 1 || tocItem.children.length')
                  template(v-for='tocSubItem in tocItem.children')
                    v-list-item(@click='$vuetify.goTo(tocSubItem.anchor, scrollOpts)')
                      v-icon.px-3(color='grey lighten-1', small) {{ $vuetify.rtl ? `mdi-chevron-left` : `mdi-chevron-right` }}
                      v-list-item-title.px-3.caption.grey--text(:class='$vuetify.theme.dark ? `text--lighten-1` : `text--darken-1`') {{tocSubItem.title}}
                    //- v-divider(inset, v-if='tocIdx < toc.length - 1')

            v-card.page-tags-card.mb-5(v-if='tags.length > 0')
              .pa-5
                .overline.teal--text.pb-2(:class='$vuetify.theme.dark ? `text--lighten-3` : ``') {{$t('common:page.tags')}}
                v-chip.mr-1.mb-1(
                  label
                  :color='$vuetify.theme.dark ? `teal darken-1` : `teal lighten-5`'
                  v-for='(tag, idx) in tags'
                  :href='`/t/` + tag.tag'
                  :key='`tag-` + tag.tag'
                  )
                  v-icon(:color='$vuetify.theme.dark ? `teal lighten-3` : `teal`', left, small) mdi-tag
                  span(:class='$vuetify.theme.dark ? `teal--text text--lighten-5` : `teal--text text--darken-2`') {{tag.title}}
                v-chip.mr-1.mb-1(
                  label
                  :color='$vuetify.theme.dark ? `teal darken-1` : `teal lighten-5`'
                  :href='`/t/` + tags.map(t => t.tag).join(`/`)'
                  :aria-label='$t(`common:page.tagsMatching`)'
                  )
                  v-icon(:color='$vuetify.theme.dark ? `teal lighten-3` : `teal`', size='20') mdi-tag-multiple

            v-card.page-comments-card.mb-5(v-if='commentsEnabled && commentsPerms.read')
              .pa-5
                .overline.pb-2.blue-grey--text.d-flex.align-center(:class='$vuetify.theme.dark ? `text--lighten-3` : `text--darken-2`')
                  span {{$t('common:comments.sdTitle')}}
                  //- v-spacer
                  //- v-chip.text-center(
                  //-   v-if='!commentsExternal'
                  //-   label
                  //-   x-small
                  //-   :color='$vuetify.theme.dark ? `blue-grey darken-3` : `blue-grey darken-2`'
                  //-   dark
                  //-   style='min-width: 50px; justify-content: center;'
                  //-   )
                  //-   span {{commentsCount}}
                .d-flex
                  v-btn.text-none(
                    @click='goToComments()'
                    :color='$vuetify.theme.dark ? `blue-grey` : `blue-grey darken-2`'
                    outlined
                    style='flex: 1 1 100%;'
                    small
                    )
                    span.blue-grey--text(:class='$vuetify.theme.dark ? `text--lighten-1` : `text--darken-2`') {{$t('common:comments.viewDiscussion')}}
                  v-tooltip(right, v-if='commentsPerms.write')
                    template(v-slot:activator='{ on }')
                      v-btn.ml-2(
                        @click='goToComments(true)'
                        v-on='on'
                        outlined
                        small
                        :color='$vuetify.theme.dark ? `blue-grey` : `blue-grey darken-2`'
                        :aria-label='$t(`common:comments.newComment`)'
                        )
                        v-icon(:color='$vuetify.theme.dark ? `blue-grey lighten-1` : `blue-grey darken-2`', dense) mdi-comment-plus
                    span {{$t('common:comments.newComment')}}

            v-card.page-author-card.mb-5
              .pa-5
                .overline.indigo--text.d-flex(:class='$vuetify.theme.dark ? `text--lighten-3` : ``')
                  span {{$t('common:page.lastEditedBy')}}
                  v-spacer
                  v-tooltip(right, v-if='isAuthenticated')
                    template(v-slot:activator='{ on }')
                      v-btn.btn-animate-edit(
                        icon
                        :href='"/h/" + locale + "/" + path'
                        v-on='on'
                        x-small
                        v-if='hasReadHistoryPermission'
                        :aria-label='$t(`common:header.history`)'
                        )
                        v-icon(color='indigo', dense) mdi-history
                    span {{$t('common:header.history')}}
                .page-author-card-name.body-2.grey--text(:class='$vuetify.theme.dark ? `` : `text--darken-3`') {{ authorName }}
                .page-author-card-date.caption.grey--text.text--darken-1 {{ updatedAt | moment('calendar') }}

            //- v-card.mb-5
            //-   .pa-5
            //-     .overline.pb-2.yellow--text(:class='$vuetify.theme.dark ? `text--darken-3` : `text--darken-4`') Rating
            //-     .text-center
            //-       v-rating(
            //-         v-model='rating'
            //-         color='yellow darken-3'
            //-         background-color='grey lighten-1'
            //-         half-increments
            //-         hover
            //-       )
            //-       .caption.grey--text 5 votes

            v-card.page-shortcuts-card(flat)
              v-toolbar(:color='$vuetify.theme.dark ? `grey darken-4-d3` : `grey lighten-3`', flat, dense)
                v-spacer
                //- v-tooltip(bottom)
                //-   template(v-slot:activator='{ on }')
                //-     v-btn(icon, tile, v-on='on', :aria-label='$t(`common:page.bookmark`)'): v-icon(color='grey') mdi-bookmark
                //-   span {{$t('common:page.bookmark')}}
                v-menu(offset-y, bottom, min-width='300')
                  template(v-slot:activator='{ on: menu }')
                    v-tooltip(bottom)
                      template(v-slot:activator='{ on: tooltip }')
                        v-btn(icon, tile, v-on='{ ...menu, ...tooltip }', :aria-label='$t(`common:page.share`)'): v-icon(color='grey') mdi-share-variant
                      span {{$t('common:page.share')}}
                  social-sharing(
                    :url='pageUrl'
                    :title='title'
                    :description='description'
                  )
                v-tooltip(bottom)
                  template(v-slot:activator='{ on }')
                    v-btn(icon, tile, v-on='on', @click='print', :aria-label='$t(`common:page.printFormat`)')
                      v-icon(:color='printView ? `primary` : `grey`') mdi-printer
                  span {{$t('common:page.printFormat')}}
                v-spacer

          v-flex.page-col-content(
            xs12
            :lg9='tocPosition !== `off`'
            :xl10='tocPosition !== `off`'
            :order-xs1='tocPosition === `right`'
            :order-xs2='tocPosition !== `right`'
            )
            v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasAnyPagePermissions && editShortcutsObj.editFab')
              template(v-slot:activator='{ on: onEditActivator }')
                v-speed-dial(
                  v-model='pageEditFab'
                  direction='top'
                  open-on-hover
                  transition='scale-transition'
                  bottom
                  :right='!$vuetify.rtl'
                  :left='$vuetify.rtl'
                  fixed
                  dark
                  )
                  template(v-slot:activator)
                    v-btn.btn-animate-edit(
                      fab
                      color='primary'
                      v-model='pageEditFab'
                      @click='pageEdit'
                      v-on='onEditActivator'
                      :disabled='!hasWritePagesPermission'
                      :aria-label='$t(`common:page.editPage`)'
                      )
                      v-icon mdi-pencil
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasReadHistoryPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageHistory'
                        )
                        v-icon(size='20') mdi-history
                    span {{$t('common:header.history')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasReadSourcePermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageSource'
                        )
                        v-icon(size='20') mdi-code-tags
                    span {{$t('common:header.viewSource')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasWritePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageConvert'
                        )
                        v-icon(size='20') mdi-lightning-bolt
                    span {{$t('common:header.convert')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasWritePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageDuplicate'
                        )
                        v-icon(size='20') mdi-content-duplicate
                    span {{$t('common:header.duplicate')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasManagePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageMove'
                        )
                        v-icon(size='20') mdi-content-save-move-outline
                    span {{$t('common:header.move')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasDeletePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        dark
                        small
                        color='red'
                        v-on='on'
                        @click='pageDelete'
                        )
                        v-icon(size='20') mdi-trash-can-outline
                    span {{$t('common:header.delete')}}
              span {{$t('common:page.editPage')}}
            v-alert.mb-5(
              v-if='!displayPublished && !showFormateurHub && !showStagiaireHub'
              color='red'
              outlined
              icon='mdi-minus-circle'
              dense
              :class='{ "rs-publish-alert": canTogglePublish && isFormationPage }'
              @click='canTogglePublish && isFormationPage ? togglePublish() : null'
              )
              .caption
                | {{ $t('common:page.unpublishedWarning') }}
                span.ml-1(v-if='canTogglePublish && isFormationPage') — Cliquer pour publier
            formation-formateur-hub(
              v-if='showFormateurHub'
              :slug='formationSlug'
              :locale='locale'
              )
            formation-stagiaire-hub(
              v-if='showStagiaireHub'
              :slug='formationSlug'
              :locale='locale'
              )
            .contents(ref='container', v-show='!showFormateurHub && !showStagiaireHub')
              slot(name='contents')
            .comments-container#discussion(v-if='commentsEnabled && commentsPerms.read && !printView')
              .comments-header
                v-icon.mr-2(dark) mdi-comment-text-outline
                span {{$t('common:comments.title')}}
              .comments-main
                slot(name='comments')
    nav-footer
    notify
    search-results
    v-fab-transition
      v-btn(
        v-if='upBtnShown'
        fab
        fixed
        bottom
        :right='$vuetify.rtl'
        :left='!$vuetify.rtl'
        small
        :depressed='this.$vuetify.breakpoint.mdAndUp'
        @click='$vuetify.goTo(0, scrollOpts)'
        color='primary'
        dark
        :style='upBtnPosition'
        :aria-label='$t(`common:actions.returnToTop`)'
        )
        v-icon mdi-arrow-up
</template>

<script>
import gql from 'graphql-tag'
import { StatusIndicator } from 'vue-status-indicator'
import Tabset from './tabset.vue'
import NavSidebar from './nav-sidebar.vue'
import FormationNavSidebar from '../../../components/formation/formation-nav-sidebar.vue'
import FormationFormateurHub from '../../../components/formation/formation-formateur-hub.vue'
import FormationStagiaireHub from '../../../components/formation/formation-stagiaire-hub.vue'
import Prism from 'prismjs'
import mermaid from 'mermaid'
import { get, sync } from 'vuex-pathify'
import _ from 'lodash'
import ClipboardJS from 'clipboard'
import Vue from 'vue'
import { enhanceCallouts } from '../../../helpers/callouts.js'

/* global siteLangs */

const PAGE_BY_PATH = gql`
  query PageByPath($path: String!, $locale: String!) {
    pages {
      singleByPath(path: $path, locale: $locale) {
        id
        path
        title
        content
        isPublished
        tags { tag }
      }
    }
  }
`

const PAGE_PUBLISH_UPDATE = gql`
  mutation PagePublishUpdate($id: Int!, $title: String!, $content: String!, $isPublished: Boolean!) {
    pages {
      update(
        id: $id
        title: $title
        content: $content
        isPublished: $isPublished
        editor: "markdown"
        description: ""
        isPrivate: false
        tags: []
      ) {
        responseResult { succeeded message }
        page { id path isPublished }
      }
    }
  }
`

Vue.component('Tabset', Tabset)

Prism.plugins.autoloader.languages_path = '/_assets/js/prism/'
Prism.plugins.NormalizeWhitespace.setDefaults({
  'remove-trailing': true,
  'remove-indent': true,
  'left-trim': true,
  'right-trim': true,
  'remove-initial-line-feed': true,
  'tabs-to-spaces': 2
})
Prism.plugins.toolbar.registerButton('copy-to-clipboard', (env) => {
  let linkCopy = document.createElement('button')
  linkCopy.textContent = 'Copy'

  const clip = new ClipboardJS(linkCopy, {
    text: () => { return env.code }
  })

  clip.on('success', () => {
    linkCopy.textContent = 'Copied!'
    resetClipboardText()
  })
  clip.on('error', () => {
    linkCopy.textContent = 'Press Ctrl+C to copy'
    resetClipboardText()
  })

  return linkCopy

  function resetClipboardText() {
    setTimeout(() => {
      linkCopy.textContent = 'Copy'
    }, 5000)
  }
})

export default {
  components: {
    NavSidebar,
    FormationNavSidebar,
    FormationFormateurHub,
    FormationStagiaireHub,
    StatusIndicator
  },
  props: {
    pageId: {
      type: Number,
      default: 0
    },
    locale: {
      type: String,
      default: 'en'
    },
    path: {
      type: String,
      default: 'home'
    },
    title: {
      type: String,
      default: 'Untitled Page'
    },
    description: {
      type: String,
      default: ''
    },
    createdAt: {
      type: String,
      default: ''
    },
    updatedAt: {
      type: String,
      default: ''
    },
    tags: {
      type: Array,
      default: () => ([])
    },
    authorName: {
      type: String,
      default: 'Unknown'
    },
    authorId: {
      type: Number,
      default: 0
    },
    editor: {
      type: String,
      default: ''
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    toc: {
      type: String,
      default: ''
    },
    sidebar: {
      type: String,
      default: ''
    },
    navMode: {
      type: String,
      default: 'MIXED'
    },
    commentsEnabled: {
      type: Boolean,
      default: false
    },
    effectivePermissions: {
      type: String,
      default: ''
    },
    commentsExternal: {
      type: Boolean,
      default: false
    },
    editShortcuts: {
      type: String,
      default: ''
    },
    filename: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      locales: siteLangs,
      navShown: false,
      navExpanded: false,
      upBtnShown: false,
      pageEditFab: false,
      scrollOpts: {
        duration: 1500,
        offset: 0,
        easing: 'easeInOutCubic'
      },
      scrollStyle: {
        vuescroll: {},
        scrollPanel: {
          initialScrollX: 0.01, // fix scrollbar not disappearing on load
          scrollingX: false,
          speed: 50
        },
        rail: {
          gutterOfEnds: '2px'
        },
        bar: {
          onlyShowBarOnScroll: false,
          background: '#42A5F5',
          hoverStyle: {
            background: '#64B5F6'
          }
        }
      },
      winWidth: 0,
      sidebarCollapsed: false,
      localPublished: null,
      publishBusy: false
    }
  },
  computed: {
    isFormationPage () {
      return /^formations\/[^/]+/.test(this.path)
    },
    formationSlug () {
      const m = this.path.match(/^formations\/([^/]+)/)
      return m ? m[1] : ''
    },
    formationDrawerClass () {
      const classes = []
      if (this.isFormationPage) {
        classes.push('rs-formation-drawer', 'theme--dark')
        if (this.isDesktop && this.sidebarCollapsed) classes.push('rs-drawer-collapsed')
      } else {
        classes.push(this.$vuetify.theme.dark ? 'grey darken-4-d4' : 'primary')
      }
      return classes.join(' ')
    },
    appRootClasses () {
      const classes = [this.$vuetify.rtl ? 'is-rtl' : 'is-ltr']
      if (this.isFormationPage) {
        classes.push('rs-formation-page', 'rs-has-sidebar')
        if (this.isDesktop && this.sidebarCollapsed) classes.push('rs-sidebar-collapsed')
      }
      return classes.join(' ')
    },
    formationMainCollapsed () {
      return this.isFormationPage && this.isDesktop && this.sidebarCollapsed
    },
    isDesktop () {
      return this.$vuetify.breakpoint.mdAndUp
    },
    isMobile () {
      return !this.isDesktop
    },
    showDefaultMobileFab () {
      return this.isMobile && !this.isFormationPage
    },
    isAuthenticated: get('user/authenticated'),
    permissions: get('user/permissions'),
    isFormateurHubPath () {
      return /\/formateur$/i.test(this.path)
    },
    isStagiaireHubPath () {
      return /\/stagiaire$/i.test(this.path)
    },
    canTogglePublish () {
      if (!this.isAuthenticated || !this.isFormationPage) return false
      const elevated = ['manage:system', 'write:pages', 'manage:pages']
      return (this.permissions || []).some(p => elevated.includes(p))
    },
    canSeeFormateur () {
      return this.canTogglePublish
    },
    showFormateurHub () {
      return this.isFormationPage && this.isFormateurHubPath && this.canSeeFormateur
    },
    showStagiaireHub () {
      return this.isFormationPage && this.isStagiaireHubPath
    },
    displayPublished () {
      if (this.localPublished !== null) return this.localPublished
      return this.isPublished
    },
    commentsCount: get('page/commentsCount'),
    commentsPerms: get('page/effectivePermissions@comments'),
    editShortcutsObj: get('page/editShortcuts'),
    rating: {
      get () {
        return 3.5
      },
      set (val) {

      }
    },
    breadcrumbs() {
      return [{ path: '/', name: 'Home' }].concat(
        _.reduce(this.path.split('/'), (result, value) => {
          result.push({
            path: _.get(_.last(result), 'path', this.locales.length > 0 ? `/${this.locale}` : '') + `/${value}`,
            name: value
          })
          return result
        }, []))
    },
    pageUrl () { return window.location.href },
    upBtnPosition () {
      if (this.$vuetify.breakpoint.mdAndUp) {
        if (this.formationMainCollapsed) {
          return this.$vuetify.rtl ? 'right: 16px;' : 'left: 16px;'
        }
        return this.$vuetify.rtl ? 'right: 235px;' : 'left: 235px;'
      }
      if (this.isFormationPage) {
        return this.$vuetify.rtl ? `right: 16px;` : `left: 16px; bottom: 72px;`
      }
      return this.$vuetify.rtl ? `right: 65px;` : `left: 65px;`
    },
    sidebarDecoded () {
      return JSON.parse(Buffer.from(this.sidebar, 'base64').toString())
    },
    tocDecoded () {
      return JSON.parse(Buffer.from(this.toc, 'base64').toString())
    },
    tocPosition: get('site/tocPosition'),
    hasAdminPermission: get('page/effectivePermissions@system.manage'),
    hasWritePagesPermission: get('page/effectivePermissions@pages.write'),
    hasManagePagesPermission: get('page/effectivePermissions@pages.manage'),
    hasDeletePagesPermission: get('page/effectivePermissions@pages.delete'),
    hasReadSourcePermission: get('page/effectivePermissions@source.read'),
    hasReadHistoryPermission: get('page/effectivePermissions@history.read'),
    hasAnyPagePermissions () {
      return this.hasAdminPermission || this.hasWritePagesPermission || this.hasManagePagesPermission ||
        this.hasDeletePagesPermission || this.hasReadSourcePermission || this.hasReadHistoryPermission
    },
    printView: sync('site/printView'),
    editMenuExternalUrl () {
      if (this.editShortcutsObj.editMenuBar && this.editShortcutsObj.editMenuExternalBtn) {
        return this.editShortcutsObj.editMenuExternalUrl.replace('{filename}', this.filename)
      } else {
        return ''
      }
    }
  },
  watch: {
    path () {
      this.localPublished = null
      this.$nextTick(() => this.applySidebarLayoutState())
    },
    sidebarCollapsed () {
      this.applySidebarLayoutState()
    },
    isFormationPage () {
      this.applySidebarLayoutState()
    }
  },
  created() {
    this.$store.set('page/authorId', this.authorId)
    this.$store.set('page/authorName', this.authorName)
    this.$store.set('page/createdAt', this.createdAt)
    this.$store.set('page/description', this.description)
    this.$store.set('page/isPublished', this.isPublished)
    this.$store.set('page/id', this.pageId)
    this.$store.set('page/locale', this.locale)
    this.$store.set('page/path', this.path)
    this.$store.set('page/tags', this.tags)
    this.$store.set('page/title', this.title)
    this.$store.set('page/editor', this.editor)
    this.$store.set('page/updatedAt', this.updatedAt)
    if (this.effectivePermissions) {
      this.$store.set('page/effectivePermissions', JSON.parse(Buffer.from(this.effectivePermissions, 'base64').toString()))
    }
    if (this.editShortcuts) {
      this.$store.set('page/editShortcuts', JSON.parse(Buffer.from(this.editShortcuts, 'base64').toString()))
    }

    this.$store.set('page/mode', 'view')
  },
  updated () {
    this.$nextTick(() => this.enhancePageCallouts())
  },
  mounted () {
    try {
      if (this.isDesktop) {
        this.sidebarCollapsed = localStorage.getItem('rs-sidebar-collapsed') === '1'
      }
    } catch (e) {}

    this.applySidebarLayoutState()

    this.$root.$on('close-formation-nav', this.closeMobileNav)

    if (this.$vuetify.theme.dark) {
      this.scrollStyle.bar.background = '#424242'
    }

    // -> Check side navigation visibility
    this.handleSideNavVisibility()
    window.addEventListener('resize', _.debounce(() => {
      this.handleSideNavVisibility()
    }, 500))

    // -> Highlight Code Blocks
    Prism.highlightAllUnder(this.$refs.container)

    // -> Callouts Obsidian [!note] [!tip] …
    this.enhancePageCallouts()
    if (this.$refs.container && typeof MutationObserver !== 'undefined') {
      this._calloutObserver = new MutationObserver(() => this.enhancePageCallouts())
      this._calloutObserver.observe(this.$refs.container, { childList: true, subtree: true })
    }

    // -> Render Mermaid diagrams
    mermaid.mermaidAPI.initialize({
      startOnLoad: true,
      theme: this.$vuetify.theme.dark ? `dark` : `default`
    })

    // -> Handle anchor scrolling
    if (window.location.hash && window.location.hash.length > 1) {
      if (document.readyState === 'complete') {
        this.$nextTick(() => {
          this.$vuetify.goTo(decodeURIComponent(window.location.hash), this.scrollOpts)
        })
      } else {
        window.addEventListener('load', () => {
          this.$vuetify.goTo(decodeURIComponent(window.location.hash), this.scrollOpts)
        })
      }
    }

    // -> Handle anchor links within the page contents
    this.$nextTick(() => {
      this.$refs.container.querySelectorAll(`a[href^="#"], a[href^="${window.location.href.replace(window.location.hash, '')}#"]`).forEach(el => {
        el.onclick = ev => {
          ev.preventDefault()
          ev.stopPropagation()
          this.$vuetify.goTo(decodeURIComponent(ev.currentTarget.hash), this.scrollOpts)
        }
      })

      window.boot.notify('page-ready')
    })
  },
  beforeDestroy () {
    this.$root.$off('close-formation-nav', this.closeMobileNav)
    if (this._sidebarLayoutTimer) window.clearInterval(this._sidebarLayoutTimer)
    if (this._calloutObserver) this._calloutObserver.disconnect()
  },
  methods: {
    enhancePageCallouts () {
      if (this.$refs.container) enhanceCallouts(this.$refs.container)
    },
    applySidebarLayoutState () {
      const collapsed = this.formationMainCollapsed
      document.documentElement.classList.toggle('rs-formation-page', this.isFormationPage)
      document.documentElement.classList.toggle('rs-has-sidebar', this.isFormationPage)
      document.documentElement.classList.toggle('rs-sidebar-collapsed', collapsed)

      if (this.isFormationPage && this.isDesktop) {
        this.navShown = !this.sidebarCollapsed
      }

      this.$nextTick(() => {
        this.syncFormationMainLayout(collapsed)
        if (this._sidebarLayoutTimer) {
          window.clearInterval(this._sidebarLayoutTimer)
          this._sidebarLayoutTimer = null
        }
        if (collapsed) {
          this._sidebarLayoutTimer = window.setInterval(() => {
            if (this.formationMainCollapsed) this.syncFormationMainLayout(true)
          }, 500)
        }
      })
    },
    syncFormationMainLayout (collapsed) {
      document.querySelectorAll('.v-main, .v-main__wrap').forEach(el => {
        if (collapsed) {
          el.style.setProperty('padding-left', '0', 'important')
          el.style.setProperty('padding-right', '0', 'important')
          el.style.setProperty('margin-left', '0', 'important')
          el.style.setProperty('width', '100%', 'important')
          el.style.setProperty('max-width', '100%', 'important')
        } else if (this.isFormationPage && this.isDesktop) {
          ['padding-left', 'padding-right', 'margin-left', 'width', 'max-width'].forEach(prop => {
            el.style.removeProperty(prop)
          })
        }
      })
    },
    setSidebarCollapsed (collapsed) {
      if (!this.isDesktop) return
      this.sidebarCollapsed = collapsed
      try {
        localStorage.setItem('rs-sidebar-collapsed', collapsed ? '1' : '0')
      } catch (e) {}
      this.applySidebarLayoutState()
    },
    openMobileNav () {
      this.sidebarCollapsed = false
      this.navShown = true
      this.$root.$emit('formation-nav-refresh')
    },
    closeMobileNav () {
      if (this.isMobile) this.navShown = false
    },
    goHome () {
      if (this.locales && this.locales.length > 0) {
        window.location.assign(`/${this.locale}/home`)
      } else {
        window.location.assign('/')
      }
    },
    toggleNavigation () {
      this.navOpen = !this.navOpen
    },
    upBtnScroll () {
      const scrollOffset = window.pageYOffset || document.documentElement.scrollTop
      this.upBtnShown = scrollOffset > window.innerHeight * 0.33
    },
    print () {
      if (this.printView) {
        this.printView = false
      } else {
        this.printView = true
        this.$nextTick(() => {
          window.print()
        })
      }
    },
    pageEdit () {
      this.$root.$emit('pageEdit')
    },
    pageHistory () {
      this.$root.$emit('pageHistory')
    },
    pageSource () {
      this.$root.$emit('pageSource')
    },
    pageConvert () {
      this.$root.$emit('pageConvert')
    },
    pageDuplicate () {
      this.$root.$emit('pageDuplicate')
    },
    pageMove () {
      this.$root.$emit('pageMove')
    },
    pageDelete () {
      this.$root.$emit('pageDelete')
    },
    handleSideNavVisibility () {
      if (window.innerWidth === this.winWidth) { return }
      this.winWidth = window.innerWidth
      if (this.$vuetify.breakpoint.mdAndUp) {
        if (this.isFormationPage && this.sidebarCollapsed) {
          this.navShown = false
        } else {
          this.navShown = true
        }
      } else {
        this.navShown = false
        this.sidebarCollapsed = false
      }
      this.applySidebarLayoutState()
    },
    goToComments (focusNewComment = false) {
      this.$vuetify.goTo('#discussion', this.scrollOpts)
      if (focusNewComment) {
        document.querySelector('#discussion-new').focus()
      }
    },
    pairedPagePath (pagePath) {
      const slash = pagePath.lastIndexOf('/')
      if (slash < 0) return null
      const stem = pagePath.slice(slash + 1)
      const parent = pagePath.slice(0, slash)
      if (stem.startsWith('exercice-')) return `${parent}/correction-${stem.slice(9)}`
      if (stem.startsWith('correction-')) return `${parent}/exercice-${stem.slice(11)}`
      return null
    },
    publishTargetPaths (pagePath) {
      const slash = pagePath.lastIndexOf('/')
      if (slash < 0) return [pagePath]
      const stem = pagePath.slice(slash + 1)
      const parent = pagePath.slice(0, slash)
      if (stem.startsWith('module-')) {
        const suffix = stem.slice('module-'.length)
        return [
          pagePath,
          `${parent}/exercice-${suffix}`,
          `${parent}/correction-${suffix}`
        ]
      }
      const pair = this.pairedPagePath(pagePath)
      return pair ? [pagePath, pair] : [pagePath]
    },
    async fetchPageRecord (path) {
      const resp = await this.$apollo.query({
        query: PAGE_BY_PATH,
        variables: { path, locale: this.locale },
        fetchPolicy: 'network-only'
      })
      return _.get(resp, 'data.pages.singleByPath')
    },
    async updatePagePublished (page, isPublished) {
      const resp = await this.$apollo.mutate({
        mutation: PAGE_PUBLISH_UPDATE,
        variables: {
          id: page.id,
          title: page.title,
          content: page.content,
          isPublished
        }
      })
      const result = _.get(resp, 'data.pages.update.responseResult')
      if (!result || !result.succeeded) {
        throw new Error(_.get(result, 'message', 'Échec de la mise à jour'))
      }
      return _.get(resp, 'data.pages.update.page')
    },
    async togglePublish () {
      if (!this.canTogglePublish || this.publishBusy || !this.isFormationPage) return
      const next = !this.displayPublished
      this.publishBusy = true
      try {
        const targets = []
        const seen = new Set()
        for (const targetPath of this.publishTargetPaths(this.path)) {
          if (seen.has(targetPath)) continue
          seen.add(targetPath)
          const page = await this.fetchPageRecord(targetPath)
          if (page) targets.push(page)
        }
        if (!targets.length) throw new Error('Page introuvable')
        for (const page of targets) {
          await this.updatePagePublished(page, next)
        }
        this.localPublished = next
        this.$store.set('page/isPublished', next)
        this.$root.$emit('formation-nav-refresh')
        this.$root.$emit('formation-nav-assets-refresh')
        const count = targets.length
        this.$store.commit('showNotification', {
          style: next ? 'green' : 'orange',
          message: next
            ? (count > 1 ? `Module publié (${count} pages)` : 'Page publiée')
            : (count > 1 ? `Module dépublié (${count} pages)` : 'Page dépubliée'),
          icon: next ? 'check' : 'minus-circle'
        })
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      } finally {
        this.publishBusy = false
      }
    }
  }
}
</script>

<style lang="scss">

.breadcrumbs-nav {
  .v-btn {
    min-width: 0;
    &__content {
      text-transform: none;
    }
  }
  .v-breadcrumbs__divider:nth-child(2n) {
    padding: 0 6px;
  }
  .v-breadcrumbs__divider:nth-child(2) {
    padding: 0 6px 0 12px;
  }
}

.page-col-sd {
  margin-top: -90px;
  align-self: flex-start;
  position: sticky;
  top: 64px;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  -ms-overflow-style: none;
}

.page-col-sd::-webkit-scrollbar {
  display: none;
}

.page-header-section {
  position: relative;

  > .is-page-header {
    position: relative;
  }

  .page-header-headings {
    min-height: 52px;
    display: flex;
    justify-content: center;
    flex-direction: column;
  }

  .page-edit-shortcuts {
    position: absolute;
    bottom: -33px;
    right: 10px;

    .v-btn {
      border-right: 1px solid #DDD !important;
      border-bottom: 1px solid #DDD !important;
      border-radius: 0;
      color: #777;
      background-color: #FFF !important;

      @at-root .theme--dark & {
        background-color: #222 !important;
        border-right-color: #444 !important;
        border-bottom-color: #444 !important;
        color: #CCC;
      }

      .v-icon {
        color: mc('blue', '700');
      }

      &:first-child {
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
      }

      &:last-child {
        border-top-right-radius: 5px;
        border-bottom-right-radius: 5px;
      }
    }
  }
}

</style>
