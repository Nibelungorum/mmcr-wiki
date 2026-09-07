<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed } from 'vue'

const { Layout } = DefaultTheme
const { theme, site, frontmatter } = useData()

const link = computed(() => {
  const ll = theme.value.logoLink
  if (typeof ll === 'string') return ll
  return ll?.link ?? '/'
})
</script>

<template>
  <Layout />
  <Teleport v-if="frontmatter.layout !== 'home'" to="body">
    <a class="vp-sidebar-logo" :href="link">
      <img
        v-if="theme.logo?.src"
        :src="theme.logo.src"
        :alt="theme.logo?.alt ?? ''"
      />
      <span class="vp-sidebar-logo-text">{{ theme.siteTitle ?? site.title }}</span>
    </a>
  </Teleport>
</template>

<style scoped>
.vp-sidebar-logo {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--vp-sidebar-width);
  height: var(--vp-nav-height);
  display: flex;
  align-items: center;
  padding: 0 32px;
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-decoration: none;
  background-color: var(--vp-sidebar-bg-color);
  border-bottom: 1px solid var(--vp-c-divider);
  z-index: 26;
}

@media (min-width: 1440px) {
  .vp-sidebar-logo {
    padding: 0 16px;
  }
}

@media (max-width: 959px) {
  .vp-sidebar-logo {
    display: none;
  }
}

.vp-sidebar-logo img {
  height: var(--vp-nav-logo-height);
  margin-right: 8px;
}

.vp-sidebar-logo-text {
  white-space: nowrap;
}
</style>
