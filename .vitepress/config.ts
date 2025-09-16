import process from 'node:process'
import { defineConfig } from 'vitepress'
import MarkdownItFootnote from 'markdown-it-footnote'
import MarkdownItMathjax3 from 'markdown-it-mathjax3'

import { BiDirectionalLinks } from '@nolebase/markdown-it-bi-directional-links'
import { InlineLinkPreviewElementTransform } from '@nolebase/vitepress-plugin-inline-link-preview/markdown-it'
import { buildEndGenerateOpenGraphImages } from '@nolebase/vitepress-plugin-og-image/vitepress'
import { UnlazyImages } from '@nolebase/markdown-it-unlazy-img'

import { siteDescription, siteName, targetDomain } from '../metadata'
import { creatorNames, creatorUsernames } from './creators'
import { sidebar as fullSidebar } from './docsMetadata.json'

// 动态侧边栏函数
export function getSidebar(database: string) {
  // 深拷贝完整侧边栏，避免修改原始数据
  const sidebarCopy = JSON.parse(JSON.stringify(fullSidebar))
  
  // 过滤和处理侧边栏项目
  return sidebarCopy.map((item: any) => {
    // 如果项目没有items，直接返回
    if (!item.items) return item
    
    // 过滤items数组，只保留指定数据库的项目
    const filteredItems = item.items.filter((subItem: any) => {
      // 检查link是否包含指定数据库路径
      return subItem.link?.includes(`/${database}/`)
    })
    
    // 如果子项目也有items，继续过滤
    const processedItems = filteredItems.map((subItem: any) => {
      if (subItem.items) {
        return {
          ...subItem,
          items: subItem.items.filter((deepItem: any) => 
            deepItem.link?.includes(`/${database}/`)
          )
        }
      }
      return subItem
    })
    
    // 返回处理后的项目，只有当有子项目时才保留
    return {
      ...item,
      items: processedItems
    }
  }).filter((item: any) => 
    // 移除没有items的顶层项目
    item.items && item.items.length > 0
  )
}

export default defineConfig({
  vue: {
    template: {
      transformAssetUrls: {
        video: ['src', 'poster'],
        source: ['src'],
        img: ['src'],
        image: ['xlink:href', 'href'],
        use: ['xlink:href', 'href'],
        NolebaseUnlazyImg: ['src'],
      },
    },
  },
  lang: 'zh-CN',
  title: siteName,
  description: siteDescription,
  ignoreDeadLinks: true,
  head: [
    ['meta', {
      name: 'theme-color',
      content: '#ffffff',
    }],
    [
      'link',
      {
        rel: 'apple-touch-icon',
        href: '/tx.webp',
        sizes: '180x180',
      },
    ],
    ['link', {
      rel: 'icon',
      href: 'tx.webp',
      type: 'image/svg+xml',
    }],
    [
      'link',
      {
        rel: 'alternate icon',
        href: '/tx.webp',
        type: 'image/png',
        sizes: '16x16',
      },
    ],
    ['meta', {
      name: 'author',
      content: creatorNames.join(', '),
    }],
    [
      'meta',
      {
        name: 'keywords',
        content:
          ['markdown', 'knowledge-base', '数据库', 'vitepress', 'obsidian', 'notebook', 'notes', ...creatorUsernames].join(', '),
      },
    ],

    ['meta', {
      property: 'og:title',
      content: siteName,
    }],
    [
      'meta',
      {
        property: 'og:image',
        content: `${targetDomain}/og.png`,
      },
    ],
    ['meta', {
      property: 'og:description',
      content: siteDescription,
    }],
    ['meta', {
      property: 'og:site_name',
      content: siteName,
    }],

    ['meta', {
      name: 'twitter:card',
      content: 'summary_large_image',
    }],
    ['meta', {
      name: 'twitter:creator',
      content: creatorUsernames.join(', '),
    }],
    [
      'meta',
      {
        name: 'twitter:image',
        content: `${targetDomain}/og.png`,
      },
    ],

    [
      'link',
      {
        rel: 'mask-icon',
        href: '/safari-pinned-tab.svg',
        color: '#927baf',
      },
    ],
    ['link', {
      rel: 'manifest',
      href: '/site.webmanifest',
    }],
    [
      // Cloudflare WEB Analytics
      'script',
      {
        defer: '',
        src: 'https://static.cloudflareinsights.com/beacon.min.js',
        'data-cf-beacon': '{"token": "ba0aaa257b3144d58debdb8b6be716d3"}'
      }
    ],
    ['meta', {
      name: 'msapplication-TileColor',
      content: '#603cba',
    }],
    // Proxying Plausible through Netlify | Plausible docs
    // https://plausible.io/docs/proxy/guides/netlify
    ['script', { 'defer': 'true', 'data-domain': 'nolebase.ayaka.io', 'data-api': '/api/v1/page-external-data/submit', 'src': '/assets/page-external-data/js/script.js' }],
  ],
  themeConfig: {
    outline: { label: 'On this page', level: 'deep' },
    darkModeSwitchLabel: '切换主题',
    footer: {
      message: '用 <span style="color: #e25555;">&#9829;</span> 撰写',
      copyright:
        'Copyright © 2025 SPAWNS. All Rights Reserved. ',
    },
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                },
              },
            },
          },
        },

        // Add title ang tags field in frontmatter to search
        // You can exclude a page from search by adding search: false to the page's frontmatter.
        _render(src, env, md) {
          // without `md.render(src, env)`, the some information will be missing from the env.
          let html = md.render(src, env)
          let tagsPart = ''
          let headingPart = ''
          let contentPart = ''
          let fullContent = ''
          const sortContent = () => [headingPart, tagsPart, contentPart] as const
          let { frontmatter, content } = env

          if (!frontmatter)
            return html

          if (frontmatter.search === false)
            return ''

          contentPart = content ||= src

          const headingMatch = content.match(/^#{1} .*/m)
          const hasHeading = !!(headingMatch && headingMatch[0] && headingMatch.index !== undefined)

          if (hasHeading) {
            const headingEnd = headingMatch.index! + headingMatch[0].length
            headingPart = content.slice(0, headingEnd)
            contentPart = content.slice(headingEnd)
          }
          else if (frontmatter.title) {
            headingPart = `# ${frontmatter.title}`
          }

          const tags = frontmatter.tags
          if (tags && Array.isArray(tags) && tags.length)
            tagsPart = `Tags: #${tags.join(', #')}`

          fullContent = sortContent().filter(Boolean).join('\n\n')

          html = md.render(fullContent, env)

          return html
        },
      },
    },
     nav: [
      { text: '主页', link: '/' },
      { text: '数据库1', link: '/数据库1/' },
      { text: '数据库3', link: '/数据库3/' },
      { text: '数据库4', link: '/数据库4/' },
    { text: '最近更新', link: '/toc' },
      { text: '菜单', items: [
          { text: '标题1', link: '/' },
          { text: '标题2', link: '/' },
          { text: '标题3', link: '/' },
          { text: '标题4', link: '/' }]
      },
      { text: '子标题嵌套', items: [
          {
            text: '子标题1',
            items: [
              { text: '标题1', link: '/' },
              { text: '标题2', link: '/' },
              { text: '标题3', link: '/' },
              { text: '标题4', link: '/' },
              { text: 'Blog', link: 'https://www.spawns.cn/',target: '_blank',rel: 'external'}
              //target: '__self', 表示直接在当前窗口打开 '_blank'表示新标签页打开
            ]
          },
          {
            text: '子标题2',
            items: [
              { text: '标题1', link: '/' },
              { text: '标题2', link: '/' },
              { text: '标题3', link: '/' },
              { text: '标题4', link: '/' }
            ]
          }
        ]
      },
    ],
  sidebar: {
    // 默认侧边栏 - 数据库
    '/': getSidebar('数据库'),
    // 数据库1的侧边栏
    '/数据库1/': getSidebar('数据库1'),
    // 数据库3的侧边栏
    '/数据库3/': getSidebar('数据库3')
  
    "/数据库4/": getSidebar('数据库4'),
},
  },
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'one-dark-pro',
    },
    math: true,
    config: (md) => {
      md.use(MarkdownItFootnote)
      md.use(MarkdownItMathjax3)
      md.use(BiDirectionalLinks({
        dir: process.cwd(),
      }))
      md.use(UnlazyImages(), {
        imgElementTag: 'NolebaseUnlazyImg',
      })
      md.use(InlineLinkPreviewElementTransform, {
        tag: 'VPNolebaseInlineLinkPreview',
      })
    },
  },
  async buildEnd(siteConfig) {
    await buildEndGenerateOpenGraphImages({
      baseUrl: targetDomain,
      category: {
        byLevel: 2,
      },
    })(siteConfig)
  },
})