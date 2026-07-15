/**
 * 扫描仓库中所有素材 .json 文件，自动生成 index.json
 * 用法：node scripts/generate-index.mjs
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..')
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
  const materials = []

  for await (const filePath of walk(ROOT)) {
    try {
      const raw = await readFile(filePath, 'utf-8')
      const data = JSON.parse(raw)
      // 用文件路径推导 id（去掉根目录前缀和 .json 后缀）
      const id = filePath
        .replace(ROOT + '/', '')
        .replace(/\.json$/, '')
      materials.push({
        id,
        name: data.name || id,
        author: data.author || 'unknown',
        category: data.category || '未分类',
        description: data.description || '',
      })
    } catch (e) {
      console.warn(`跳过 ${filePath}: ${e.message}`)
    }
  }

  materials.sort((a, b) => a.id.localeCompare(b.id))

  await writeFile(
    join(ROOT, 'index.json'),
    JSON.stringify(materials, null, 2) + '\n',
    'utf-8'
  )
  console.log(`index.json 已生成，共 ${materials.length} 条素材索引`)
}

main().catch(console.error)
