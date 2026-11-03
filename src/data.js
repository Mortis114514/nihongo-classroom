// 載入單字、文法、題目資料（public/data/*.json）
import { getMyWords } from './storage.js'

const cache = new Map()

function loadJson(name) {
  if (!cache.has(name)) {
    const url = `${import.meta.env.BASE_URL}data/${name}.json`
    const request = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`載入 ${url} 失敗（${res.status}）`)
      return res.json()
    })
    // 失敗時不要留在快取裡，下次才能重試
    request.catch(() => cache.delete(name))
    cache.set(name, request)
  }
  return cache.get(name)
}

/** 內建單字 + 使用者在單字本新增的單字 */
export async function loadVocab() {
  const builtIn = await loadJson('vocab')
  return [...builtIn, ...getMyWords()]
}

export function loadGrammar() {
  return loadJson('grammar')
}

export function loadQuestions() {
  return loadJson('questions')
}
