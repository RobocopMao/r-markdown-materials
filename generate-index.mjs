/**
 * 扫描仓库中所有素材 .json 文件，自动生成 index.json
 * 用法：node scripts/generate-index.mjs
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = __dirname
const EXCLUDE = ['index.json', 'package.json', 'package-lock.json']

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(fullPath)
    } else if (
      entry.isFile() &&
      extname(entry.name) === '.json' &&
      !EXCLUDE.includes(entry.name) &&
      !entry.name.startsWith('.')
    ) {
      yield fullPath
    }
  }
}

async function main() {
  const entries = []

  for await (const filePath of walk(ROOT)) {
    try {
      // 用文件路径推导 id（去掉根目录前缀和 .json 后缀）
      const id = relative(ROOT, filePath).replace(/\.json$/, '')
      // 读取素材 JSON 提取 name、category 字段，使搜索和分类筛选可在加载前生效
      const raw = await readFile(filePath, 'utf-8')
      const data = JSON.parse(raw)
      entries.push({ id, name: data.name || id, category: data.category || '' })
    } catch (e) {
      console.warn(`跳过 ${filePath}: ${e.message}`)
    }
  }

  // 按 id 中的日期倒序排列，最新上传排在最前
  // id 格式为 category/yyyy/mm/dd/xxx，先从 id 中提取日期部分作为排序键
  const extractDate = (id) => {
    const m = id.match(/(\d{4}\/\d{2}\/\d{2})/)
    return m ? m[1] : ''
  }
  entries.sort((a, b) => {
    const dateA = extractDate(a.id)
    const dateB = extractDate(b.id)
    if (dateA !== dateB) return dateB.localeCompare(dateA) // 日期倒序
    return b.id.localeCompare(a.id) // 同一天按完整 id 倒序兜底
  })

  await writeFile(
    join(ROOT, 'index.json'),
    JSON.stringify(entries, null, 2) + '\n',
    'utf-8'
  )
  console.log(`index.json 已生成，共 ${entries.length} 条素材索引`)
}

main().catch(console.error)
