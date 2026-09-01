import { readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type DefaultTheme } from 'vitepress'

const locale = 'zh-cn'
const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', locale)
const sectionTitles: Record<string, string> = {
  '快速开始': '快速开始',
  '示例': '全部示例',
  'API': 'API 参考',
}

/** Sidebar section order: lower number comes first. Sections not listed here fall back to pinyin sort. */
const sectionOrders: Record<string, number> = {
  '快速开始': 1,
  '示例': 2,
  'API': 3,
}

export const zh = defineConfig({
  lang: 'zh-Hans',
  description: '面向现代 Minecraft 的可配置多方块机器框架',
  themeConfig: {
    nav: nav(),
    sidebar: sidebar(),
    editLink: {
      pattern: 'https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/edit/main/wiki/:path',
      text: '在 GitHub 上编辑此页面',
    },
    footer: {
      message: '基于 GNU GPL v3.0 许可证发布',
      copyright: '版权所有 © 2026-现在 HowXu',
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    outline: {
      label: '页面导航',
    },
  },
})

function nav(): DefaultTheme.NavItem[] {
  return [
    { text: '首页', link: '/zh-cn/' },
    { text: '快速开始', link: '/zh-cn/快速开始/开始' },
    { text: '全部示例', link: '/zh-cn/示例/开始' },
    { text: 'API 参考', link: '/zh-cn/API/开始' },
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
      if (entry.isDirectory()) {
        return markdownFiles(path)
      }
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
  return `/${locale}/${relative(docsDir, file).split(sep).join('/').replace(/\.md$/, '')}`
}
