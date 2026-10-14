import { readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type DefaultTheme } from 'vitepress'

const locale = 'en-us'
const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', locale)
const sectionTitles: Record<string, string> = {
  'getting-started': 'Getting Started',
  'KubeJS': 'KubeJS Examples',
  'JavaAPI': 'JavaAPI Examples',
  'API': 'API Reference',
}

const sectionOrders: Record<string, number> = {
  'getting-started': 1,
  'KubeJS': 2,
  'JavaAPI': 3,
  'API': 4,
}

export const en = defineConfig({
  lang: 'en-US',
  description: 'A configurable multiblock machine framework for modern Minecraft',
  themeConfig: {
    nav: nav(),
    sidebar: sidebar(),
    editLink: {
      pattern: 'https://github.com/Nibelungorum/mmcr-wiki/edit/main/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Released under the GNU GPL v3.0 License',
      copyright: 'Copyright © 2026-present HowXu',
    },
    docFooter: {
      prev: 'Previous page',
      next: 'Next page',
    },
    outline: {
      label: 'On this page',
    },
  },
})

function nav(): DefaultTheme.NavItem[] {
  return [
    { text: 'Home', link: '/en-us/' },
    { text: 'Getting Started', link: '/en-us/getting-started/' },
    { text: 'All Examples', link: '/en-us/KubeJS/blast-furnace' },
    { text: 'API Reference', link: '/en-us/API/' },
  ]
}

function sidebar(): DefaultTheme.Sidebar {
  return readdirSync(docsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) =>
      orderCompare(sectionOrders[left.name], sectionOrders[right.name],
        () => left.name.localeCompare(right.name)))
    .map((section) => ({
      text: sectionTitles[section.name] ?? section.name,
      items: readPages(resolve(docsDir, section.name)),
    }))
    .filter((section) => section.items.length > 0)
}

function readPages(directory: string): DefaultTheme.SidebarItem[] {
  return markdownFiles(directory)
    .map((file) => ({ file, meta: pageMeta(file) }))
    .sort((left, right) =>
      orderCompare(left.meta.order, right.meta.order,
        () => basename(left.file, '.md').localeCompare(basename(right.file, '.md'))))
    .map(({ file, meta }) => ({
      text: meta.title ?? basename(file, '.md'),
      link: pageLink(file),
    }))
}

function markdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) return markdownFiles(path)
      return entry.isFile() && extname(entry.name) === '.md' ? [path] : []
    })
}

interface PageMeta {
  title?: string
  order?: number
}

function pageMeta(file: string): PageMeta {
  const block = readFileSync(file, 'utf8')
    .match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/)?.[1]
  return {
    title: block ? stringField(block, 'title') : undefined,
    order: block ? numberField(block, 'order') : undefined,
  }
}

function stringField(block: string, key: string): string | undefined {
  const match = block.match(
    new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(.+?))\\s*$`, 'm'))
  return match?.[1] ?? match?.[2] ?? match?.[3]?.trim()
}

function numberField(block: string, key: string): number | undefined {
  const raw = stringField(block, key)
  if (raw === undefined) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function orderCompare(
  left: number | undefined,
  right: number | undefined,
  tiebreak: () => number,
): number {
  const lo = left ?? Number.POSITIVE_INFINITY
  const ro = right ?? Number.POSITIVE_INFINITY
  return lo !== ro ? lo - ro : tiebreak()
}

function pageLink(file: string): string {
  return `/${locale}/${relative(docsDir, file).split(sep).join('/').replace(/\.md$/, '').replace(/(^|\/)index$/, '$1')}`
}
