// 讀寫 localStorage：progress、myWords、quizHistory、settings

const KEYS = {
  progress: 'progress',
  myWords: 'myWords',
  quizHistory: 'quizHistory',
  settings: 'settings',
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    // 無痕模式、儲存被封鎖或資料損毀時，退回預設值
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`無法寫入 localStorage（${key}）`, err)
  }
}

/** 今天的日期，格式 YYYY-MM-DD（本地時間） */
export function today() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ---- 單字學習進度 ----
// 格式：{ [單字 id]: { known: boolean, reviews: number, lastReviewed: 'YYYY-MM-DD' } }

export function getProgress() {
  return read(KEYS.progress, {})
}

/** 標記單字為「記住了」(known = true) 或「再複習」(known = false) */
export function markWord(id, known) {
  const progress = getProgress()
  const prev = progress[id] ?? { known: false, reviews: 0, lastReviewed: null }
  progress[id] = { known, reviews: prev.reviews + 1, lastReviewed: today() }
  write(KEYS.progress, progress)
}

// ---- 自己新增的單字（格式同 vocab.json）----

export function getMyWords() {
  return read(KEYS.myWords, [])
}

// ---- 測驗紀錄 ----
// 格式：[{ date: 'YYYY-MM-DD', mode: 'mixed' | 'vocab' | 'grammar', total, correct, wrongIds: [] }]，新的在後面

const MAX_QUIZ_HISTORY = 100

export function getQuizHistory() {
  const list = read(KEYS.quizHistory, [])
  return Array.isArray(list) ? list : []
}

export function addQuizRecord(record) {
  const list = [...getQuizHistory(), { date: today(), ...record }]
  write(KEYS.quizHistory, list.slice(-MAX_QUIZ_HISTORY))
}
