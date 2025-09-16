#!/usr/bin/env tsx
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import process from 'node:process'
import fs from 'fs-extra'
import fg from 'fast-glob'
import Git from 'simple-git'
import matter from 'gray-matter'
import uniq from 'lodash/uniq'
import TagsAlias from '../.vitepress/docsTagsAlias.json'
import type { ArticleTree, DocsMetadata, DocsTagsAlias, Tag } from './types/metadata'
import { include } from '../metadata/index'

const dir = './'
const folderTop = true

export const DIR_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const DIR_VITEPRESS = resolve(dirname(fileURLToPath(import.meta.url)), '../.vitepress')

const git = Git(DIR_ROOT)

/**
 * 列出所有的页面
 * @param dir 目录
 * @param options 选项
 * @param options.target 目标
 * @param options.ignore 忽略
 * @returns 符合 glob 的文件列表
 */
export async function listPages(dir: string, options: { target?: string, ignore?: string[] }) {
  const {
    target = '',
    ignore = [],
  } = options

  const files = await fg(`${target}**/*.md`, {
    onlyFiles: true,
    cwd: dir,
    ignore: [
      '_*',
      'dist',
      'node_modules',
      ...ignore,
    ],
  })

  files.sort()
  return files
}

/**
 * 添加和计算路由项
 * @param indexes 路由树
 * @param path 路径
 * @param target 目标目录
 * @param upgradeIndex 是否升级 index
 * @returns 路由树
 */
async function addRouteItem(indexes: ArticleTree[], path: string, target: string, upgradeIndex = false) {
  const suffixIndex = path.lastIndexOf('.')
  const nameStartsAt = path.lastIndexOf('/') + 1
  const title = path.slice(nameStartsAt, suffixIndex)
  const item = {
    index: title,
    text: title,
    link: `/${path.slice(0, suffixIndex)}`,
    lastUpdated: +await git.raw(['log', '-1', '--format=%at', path]) * 1000,
  }
  const linkItems = item.link.split('/')
  linkItems.shift()

  target.split('/').forEach((item) => {
    if (item)
      linkItems.shift()
  })

  if (linkItems.length === 1)
    return

  indexes = addRouteItemRecursion(indexes, item, linkItems, target, upgradeIndex)
}

/**
 * 递归式添加和计算路由项
 * @param indexes 路由树
 * @param item 路由项
 * @param path 路径
 * @param target 目标目录
 * @param upgradeIndex 是否升级 index
 * @returns 路由树
 */
function addRouteItemRecursion(indexes: ArticleTree[], item: any, path: string[], target: string, upgradeIndex: boolean) {
  if (path.length === 1) {
    indexes.push(item)
    return indexes
  }
  else {
    const onePath = path.shift()
    if (!onePath)
      return indexes

    let obj = indexes.find(obj => obj.index === onePath)

    if (!obj) {
      // 如果没有找到，就创建一个
      obj = { index: onePath, text: onePath, collapsed: true, items: [] }
      indexes.push(obj)
    }
    else if (!obj.items) {
      // 如果找到了，但是没有 items，就创建对应的 items 和标记为可折叠
      obj.collapsed = true
      obj.items = []
    }

    if (path.length === 1 && path[0] === 'index') {
      // 如果只有一个元素，并且是 index.md，直接写入 link 和 lastUpdated
      obj.link = item.link
      obj.lastUpdated = item.lastUpdated
    }
    else {
      // 否则，递归遍历
      obj.items = addRouteItemRecursion(obj.items ?? [], item, path, target, upgradeIndex)
    }

    return indexes
  }
}

/**
 * 处理 docsMetadata.sidebar，拼接 sidebar 路由树
 * @param docs 符合 glob 的文件列表
 * @param docsMetadata docsMetadata.json 的内容
 * @param target 目标目录
 */
async function processSidebar(docs: string[], docsMetadata: DocsMetadata, target: string) {
  await Promise.all(docs.map(async (docPath: string) => {
    await addRouteItem(docsMetadata.sidebar, docPath, target)
  }))
}

/**
 * 排序传入的ArticleTree数组
 * @param articleTree 需要排序的ArticleTree数组
 * @return 排序后的结果
 */
function articleTreeSort(articleTree: ArticleTree[]) {
  articleTree.sort((itemA, itemB) => {
    return itemA.text.localeCompare(itemB.text)
  })
  return articleTree
}

/**
 * 排序sidebar,返回新的sidebar数组
 * @param sidebar 需要排序的ArticleTree数组
 * @param folderTop 是否优先排序文件夹
 * @returns ArticleTree[] 排序好了的数组
 */
function sidebarSort(sidebar: ArticleTree[], folderTop: boolean = true) {
  let _sideBar
  if (folderTop) {
    // 分别找出直接的文件和嵌套文件夹
    const files = articleTreeSort(sidebar.filter((item) => {
      return !item.items || item.items.length === 0
    }))
    const folders = articleTreeSort(sidebar.filter((item) => {
      return item.items && item.items.length > 0
    }))
    // 然后在排序完成后合并为新的数组
    _sideBar = [...folders, ...files]
  }
  else {
    _sideBar = articleTreeSort(sidebar)
  }

  // 如果有子菜单就递归排序每个子菜单
  for (const articleTree of _sideBar) {
    if (articleTree.items && articleTree.items.length > 0)
      articleTree.items = sidebarSort(articleTree.items, folderTop)
  }
  return _sideBar
}

/**
 * 判断 srcTag 是否是 targetTag 的别名
 *
 * 判断根据下面的规则进行：
 * 1. srcTag === targetTag
 * 2. srcTag.toUpperCase() === targetTag.toUpperCase()
 *
 * @param srcTag 原始 tag
 * @param targetTag 目标 tag
 * @returns 是否是别名
 */
function isTagAliasOfTag(srcTag: string, targetTag: string) {
  return srcTag === targetTag || srcTag.toUpperCase() === targetTag.toUpperCase()
}

function findTagAlias(tag: string, docsMetadata: DocsMetadata, aliasMapping: DocsTagsAlias[]) {
  const potentialAlias: string[] = []

  docsMetadata.tags.forEach((item) => {
    // 在已经存在在 docsMetadata.json 中的 alias 进行查找和筛选
    item.alias.filter((alias) => {
      return isTagAliasOfTag(alias, tag) // 筛选 alias 是 tag 的别名的 alias
    }).forEach((alias) => {
      potentialAlias.push(alias) // 将别名加入到 potentialAlias 中
    })

    if (isTagAliasOfTag(item.name, tag)) { // 如果有记录的 tag.name 是当前 tag 的别名
      potentialAlias.push(item.name) // 那么将 tag.name 加入到 potentialAlias 中
    }
  })

  // 在 docsTagsAlias.json 中进行查找和筛选
  for (const aliasTag of aliasMapping) {
    // 如果人工编撰的的 aliasTag.name 是当前 tag 的别名
    // 那么这意味着 aliasTag.name 和 aliasTag.alias 中的所有 alias 都是当前 tag 的别名
    if (isTagAliasOfTag(aliasTag.name, tag)) {
      // 将 aliasTag.name 和 aliasTag.alias 中的所有 alias 加入到 potentialAlias 中
      potentialAlias.push(aliasTag.name)
      potentialAlias.push(...aliasTag.alias)
    }

    aliasTag.alias.forEach((alias) => {
      // 如果人工编撰的的 aliasTag.alias 中的某个 alias 是当前 tag 的别名
      // 那么这意味着 aliasTag.name 和 aliasTag.alias 中的所有 alias 都是当前 tag 的别名
      if (isTagAliasOfTag(alias, tag)) {
        // 将 aliasTag.name 和 aliasTag.alias 中的所有 alias 加入到 potentialAlias 中
        potentialAlias.push(aliasTag.name)
        potentialAlias.push(...aliasTag.alias)
      }
    })
  }

  return potentialAlias
}

async function processTags(doc: string, docsMetadata: DocsMetadata, tags: string[]) {
  for (const tag of tags) {
    docsMetadata.tags = docsMetadata.tags || []
    const found = docsMetadata.tags.find((item) => {
      if (item.name === tag)
        return item
      return null
    })

    // 优先查找所有的 alias
    const aliases = uniq(findTagAlias(tag, docsMetadata, TagsAlias))

    // 对于每一个 alias，如果在 docsMetadata.tags 中找到了，那么就将当前 doc 加入到 appearedInDocs 中
    docsMetadata.tags.forEach((item, index) => {
      aliases.forEach((alias) => {
        if (item.name === alias && !docsMetadata.tags[index].appearedInDocs.includes(doc))
          docsMetadata.tags[index].appearedInDocs.push(doc)
      })
    })

    // 如果 tag 尚未出现在 docsMetadata.tags 中，那么就创建一个新的 tag
    if (!found) {
      const tagRecord: Tag = {
        name: tag,
        alias: aliases,
        appearedInDocs: [],
        description: '',
        count: 1,
      }

      // 将当前 doc 加入到 appearedInDocs 中
      tagRecord.appearedInDocs.push(doc)
      // 将新创建的 tag 加入到 docsMetadata.tags 中
      docsMetadata.tags.push(tagRecord)
      continue
    }

    found.count++
    if (!found.appearedInDocs.includes(doc))
      found.appearedInDocs.push(doc)
    found.alias = uniq([...found.alias, ...aliases])
  }
}

/**
 * 处理 docsMetadata.docs，计算和统计 sha256 hash 等信息
 * @param docs 符合 glob 的文件列表
 * @param docsMetadata docsMetadata.json 的内容
 */
async function processDocs(docs: string[], docsMetadata: DocsMetadata) {
  if (!docsMetadata.docs)
    docsMetadata.docs = []

  const tagsToBeProcessed: { doc: string, tags: string[] }[] = []

  docsMetadata.docs = docs.map((docPath) => {
    // 尝试在 docsMetadata.docs 中找到当前文件的历史 hash 记录
    const found = docsMetadata.docs.find((item) => {
      if (item.relativePath === docPath)
        return item
      return null
    })

    // 读取源文件
    const content = fs.readFileSync(docPath, 'utf-8')
    // 解析 Markdown 文件的 frontmatter
    const parsedPageContent = matter(content)

    if (Array.isArray(parsedPageContent.data.tags)) {
      if (parsedPageContent.data.tags.includes(null))
        console.error('null tag found in', docPath)

      tagsToBeProcessed.push({ doc: docPath, tags: parsedPageContent.data.tags })
    }

    const hash = createHash('sha256')
    const tempSha256Hash = hash.update(parsedPageContent.content).digest('hex') // 对 Markdown 正文进行 sha256 hash

    // 如果没有找到，就初始化
    if (!found) {
      return {
        relativePath: docPath,
        hashes: { sha256: { content: tempSha256Hash } },
      }
    }
    else {
      // 如果 found.hashes 不存在，就初始化
      if (!found.hashes)
        found.hashes = { sha256: { content: tempSha256Hash } }
      // 如果 found.hashes.sha256 不存在，就初始化
      if (!found.hashes.sha256)
        found.hashes.sha256 = { content: tempSha256Hash }
      // 如果历史记录的 sha256 hash 与当前的相同，就不标记 contentDiff，并且直接返回
      if (found.hashes.sha256.content === tempSha256Hash && !found.hashes.sha256.contentDiff)
        return found

      // 否则，标记 contentDiff
      found.hashes.sha256.contentDiff = tempSha256Hash
      return found
    }
  })

  await Promise.all(tagsToBeProcessed.map(async ({ doc, tags }) => {
    await processTags(doc, docsMetadata, tags)
  }))
}

/**
 * 主要的运行函数
 * 支持处理多个文档目录，按文件夹分组显示
 */
async function run() {
  const docsMetadata: DocsMetadata = { docs: [], sidebar: [], tags: [] }
  
  console.log(`开始处理文档目录: ${include.join(', ')}`)
  
  // 为每个目录创建分组
  for (const targetDir of include) {
    const targetPath = `${targetDir}/`
    console.log(`\n正在处理目录: ${targetDir}`)
    
    let now = (new Date()).getTime()
    const docs = await listPages(dir, { target: targetPath })
    console.log(`  - 发现 ${docs.length} 个Markdown文件 (${(new Date()).getTime() - now}ms)`)
    
    now = (new Date()).getTime()
    await processDocs(docs, docsMetadata)
    console.log(`  - 处理文档完成 (${(new Date()).getTime() - now}ms)`)
    
    now = (new Date()).getTime()
    
    // 创建目录分组
    const dirGroup: ArticleTree = {
      index: targetDir,
      text: `📁 ${targetDir}`,  // 添加文件夹图标
      collapsed: false,        // 默认展开当前目录
      items: []
    }
    
    // 处理该目录的文档到分组中
    await processSidebar(docs, { sidebar: dirGroup.items } as DocsMetadata, targetPath)
    
    // 添加到主侧边栏
    docsMetadata.sidebar.push(dirGroup)
    console.log(`  - 处理侧边栏完成 (${(new Date()).getTime() - now}ms)`)
  }
  
  // 最后统一排序
  console.log('\n正在排序侧边栏...')
  let now = (new Date()).getTime()
  docsMetadata.sidebar = sidebarSort(docsMetadata.sidebar, folderTop)
  console.log(`排序完成 (${(new Date()).getTime() - now}ms)`)
  
  // 输出统计信息
  console.log(`\n处理完成:`)
  console.log(`- 总文档数: ${docsMetadata.docs.length}`)
  console.log(`- 总标签数: ${docsMetadata.tags.length}`)
  console.log(`- 目录数: ${include.length}`)
  console.log(`- 侧边栏项目数: ${docsMetadata.sidebar.length}`)
  
  now = (new Date()).getTime()
  await fs.writeJSON(join(DIR_VITEPRESS, 'docsMetadata.json'), docsMetadata, { spaces: 2 })
  console.log(`\n写入 docsMetadata.json 完成 (${(new Date()).getTime() - now}ms)`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})