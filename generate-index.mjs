/**
 * 扫描仓库中所有素材 .json 文件，自动生成 index.json
 * 用法：node scripts/generate-index.mjs
 */

import { readdir, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
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
  const ids = []

  for await (const filePath of walk(ROOT)) {
    try {
      // 用文件路径推导 id（去掉根目录前缀和 .json 后缀）
      const id = filePath
        .replace(ROOT + '/', '')
        .replace(/\.json$/, '')
      ids.push(id)
    } catch (e) {
      console.warn(`跳过 ${filePath}: ${e.message}`)
    }
  }

  ids.sort()

  await writeFile(
    join(ROOT, 'index.json'),
    JSON.stringify(ids, null, 2) + '\n',
    'utf-8'
  )
  console.log(`index.json 已生成，共 ${ids.length} 条素材索引`)
}

main().catch(console.error)
