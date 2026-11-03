// 測驗：單字選意思、文法填空、隨機出題、顯示解說與分數
import { loadVocab, loadGrammar, loadQuestions } from '../data.js'
import { getQuizHistory, addQuizRecord } from '../storage.js'
import { shuffle, escapeHtml as esc } from '../utils/shuffle.js'

const MODES = [
  { id: 'mixed', label: '混合' },
  { id: 'vocab', label: '單字選意思' },
  { id: 'grammar', label: '文法填空' },
]
const SIZES = [5, 10, 0] // 0 = 全部
const MAX_OPTIONS = 4

const modeLabel = (id) => MODES.find((m) => m.id === id)?.label ?? id

/** 單字題：看日文選中文意思，錯誤選項從其他單字的意思隨機挑 */
function makeVocabQuestions(words) {
  const meanings = [...new Set(words.map((w) => w.meaning).filter(Boolean))]
  if (meanings.length < 2) return []
  return words
    .filter((w) => w.word && w.meaning)
    .map((w) => {
      const wrong = shuffle(meanings.filter((m) => m !== w.meaning)).slice(0, MAX_OPTIONS - 1)
      const options = shuffle([w.meaning, ...wrong])
      return {
        key: `vocab:${w.id}`,
        id: w.id,
        kind: 'vocab',
        prompt: w.word,
        options,
        answer: options.indexOf(w.meaning),
        word: w,
      }
    })
}

/** 文法題：來自 questions.json，選項順序每次打亂 */
function makeGrammarQuestions(questions, grammarById) {
  return questions
    .filter((q) => q.type === 'grammar' && Array.isArray(q.options) && q.options[q.answer] != null)
    .map((q) => {
      const order = shuffle(q.options.map((_, i) => i))
      return {
        key: `grammar:${q.id}`,
        id: q.id,
        kind: 'grammar',
        prompt: q.prompt,
        options: order.map((i) => q.options[i]),
        answer: order.indexOf(q.answer),
        explain: q.explain,
        grammar: grammarById.get(q.grammarId),
      }
    })
}

export async function render(root) {
  root.innerHTML = '<p class="muted">載入題目中…</p>'

  let vocab, grammar, questions
  try {
    ;[vocab, grammar, questions] = await Promise.all([loadVocab(), loadGrammar(), loadQuestions()])
  } catch (err) {
    console.error(err)
    root.innerHTML = '<p class="error">題目資料載入失敗，請重新整理頁面。</p>'
    return
  }
  if (!root.isConnected) return

  const grammarById = new Map(grammar.map((g) => [g.id, g]))

  // 每次開始測驗都重新產生題目，讓單字題的錯誤選項也會變
  const pool = {
    vocab: () => makeVocabQuestions(vocab),
    grammar: () => makeGrammarQuestions(questions, grammarById),
  }
  const available = {
    vocab: pool.vocab().length,
    grammar: pool.grammar().length,
  }
  available.mixed = available.vocab + available.grammar

  const state = {
    screen: 'setup', // setup | question | result
    mode: available.mixed === 0 ? 'mixed' : MODES.find((m) => available[m.id] > 0).id,
    size: 10,
    list: [],
    index: 0,
    picked: null, // 目前這題選了哪個選項
    answers: [], // 每題選的選項 index
  }

  root.innerHTML = '<section class="quiz" data-ref="screen"></section>'
  const screen = root.querySelector('[data-ref="screen"]')

  function buildQuiz() {
    const list =
      state.mode === 'mixed' ? [...pool.vocab(), ...pool.grammar()] : pool[state.mode]()
    const n = state.size === 0 ? list.length : Math.min(state.size, list.length)
    return shuffle(list).slice(0, n)
  }

  function start() {
    state.list = buildQuiz()
    state.index = 0
    state.picked = null
    state.answers = []
    state.screen = 'question'
    draw()
  }

  function pick(i) {
    if (state.screen !== 'question' || state.picked !== null) return
    const q = state.list[state.index]
    if (i < 0 || i >= q.options.length) return
    state.picked = i
    state.answers[state.index] = i
    draw()
    screen.querySelector('[data-action="next"]')?.focus()
  }

  function next() {
    if (state.screen !== 'question' || state.picked === null) return
    if (state.index + 1 < state.list.length) {
      state.index++
      state.picked = null
      draw()
      screen.querySelector('.quiz-option')?.focus()
    } else {
      finish()
    }
  }

  function finish() {
    const wrong = state.list.filter((q, i) => state.answers[i] !== q.answer)
    addQuizRecord({
      mode: state.mode,
      total: state.list.length,
      correct: state.list.length - wrong.length,
      wrongIds: wrong.map((q) => q.id),
    })
    state.screen = 'result'
    draw()
    screen.querySelector('h2')?.focus()
  }

  // ---- 畫面 ----

  function setupHtml() {
    const chip = (attr, value, label, pressed, disabled = false, count = null) => `
      <button type="button" class="chip" data-${attr}="${value}" aria-pressed="${pressed}" ${disabled ? 'disabled' : ''}>
        ${label}${count === null ? '' : `<span class="chip-count">${count}</span>`}
      </button>`

    const total = available[state.mode]
    const n = state.size === 0 ? total : Math.min(state.size, total)
    const history = getQuizHistory().slice(-5).reverse()

    return `
      <div class="panel quiz-setup">
        <h2>測驗</h2>
        <div class="quiz-field">
          <h3>題型</h3>
          <div class="chips" role="group" aria-label="題型">
            ${MODES.map((m) => chip('mode', m.id, m.label, m.id === state.mode, available[m.id] === 0, available[m.id])).join('')}
          </div>
        </div>
        <div class="quiz-field">
          <h3>題數</h3>
          <div class="chips" role="group" aria-label="題數">
            ${SIZES.map((s) => chip('size', s, s === 0 ? '全部' : `${s} 題`, s === state.size)).join('')}
          </div>
        </div>
        <button type="button" class="btn btn-primary quiz-start" data-action="start" ${n === 0 ? 'disabled' : ''}>
          開始測驗（共 ${n} 題）
        </button>
        ${available.mixed === 0 ? '<p class="muted">目前沒有可以出題的資料。</p>' : ''}
      </div>
      ${
        history.length
          ? `<div class="quiz-history">
              <h3>最近的成績</h3>
              <ul>
                ${history
                  .map(
                    (r) => `
                  <li>
                    <span>${esc(r.date)}</span>
                    <span>${esc(modeLabel(r.mode))}</span>
                    <strong>${Number(r.correct)} / ${Number(r.total)}</strong>
                  </li>`,
                  )
                  .join('')}
              </ul>
            </div>`
          : ''
      }`
  }

  function feedbackHtml(q) {
    const ok = state.picked === q.answer
    const head = ok
      ? '<p class="quiz-verdict is-correct">答對了！</p>'
      : `<p class="quiz-verdict is-wrong">答錯了，正確答案是「<span lang="${q.kind === 'grammar' ? 'ja' : 'zh-Hant'}">${esc(q.options[q.answer])}</span>」</p>`

    let detail = ''
    if (q.kind === 'vocab') {
      const w = q.word
      detail = `
        <p><span lang="ja" class="quiz-word">${esc(w.word)}</span>${w.kana && w.kana !== w.word ? `（<span lang="ja">${esc(w.kana)}</span>）` : ''}：${esc(w.meaning)}</p>
        ${w.example ? `<p lang="ja">${esc(w.example)}</p>` : ''}
        ${w.exampleZh ? `<p class="muted">${esc(w.exampleZh)}</p>` : ''}`
    } else {
      const g = q.grammar
      detail = `
        ${q.explain ? `<p>${esc(q.explain)}</p>` : ''}
        ${g ? `<p class="muted">相關文法：<a href="#/grammar"><span lang="ja">${esc(g.pattern)}</span>（${esc(g.gist)}）</a></p>` : ''}`
    }
    const last = state.index + 1 === state.list.length
    return `
      <div class="quiz-feedback ${ok ? 'is-correct' : 'is-wrong'}" role="status">
        ${head}
        ${detail}
      </div>
      <div class="quiz-actions">
        <button type="button" class="btn btn-primary" data-action="next">${last ? '看結果' : '下一題'}</button>
      </div>`
  }

  function questionHtml() {
    const q = state.list[state.index]
    const done = state.picked !== null
    const score = state.list.slice(0, state.index + (done ? 1 : 0)).filter((x, i) => state.answers[i] === x.answer).length

    const options = q.options
      .map((opt, i) => {
        let cls = ''
        if (done && i === q.answer) cls = 'is-correct'
        else if (done && i === state.picked) cls = 'is-wrong'
        return `
          <button type="button" class="quiz-option ${cls}" data-option="${i}" ${done ? 'disabled' : ''}>
            <span class="quiz-key">${i + 1}</span>
            <span ${q.kind === 'grammar' ? 'lang="ja"' : ''}>${esc(opt)}</span>
          </button>`
      })
      .join('')

    return `
      <div class="quiz-top">
        <span>第 ${state.index + 1} / ${state.list.length} 題</span>
        <span>答對 ${score}</span>
      </div>
      <div class="quiz-bar" aria-hidden="true"><span style="width:${((state.index + (done ? 1 : 0)) / state.list.length) * 100}%"></span></div>
      <div class="panel quiz-card">
        <p class="quiz-kind">${q.kind === 'vocab' ? '這個單字是什麼意思？' : '選出最適合填入空格的答案'}</p>
        <p class="quiz-prompt ${q.kind === 'vocab' ? 'is-word' : ''}" lang="ja">${esc(q.prompt)}</p>
        <div class="quiz-options">${options}</div>
        ${done ? feedbackHtml(q) : ''}
      </div>
      <p class="hint">快捷鍵：1～${q.options.length} 選答案 ・ Enter 下一題</p>`
  }

  function resultHtml() {
    const total = state.list.length
    const correct = state.list.filter((q, i) => state.answers[i] === q.answer).length
    const pct = Math.round((correct / total) * 100)
    const msg = pct === 100 ? '全部答對，太厲害了！' : pct >= 80 ? '很不錯，繼續保持！' : pct >= 60 ? '還可以，再複習一下答錯的題目吧。' : '多練幾次就會進步的！'

    const wrong = state.list
      .map((q, i) => ({ q, picked: state.answers[i] }))
      .filter(({ q, picked }) => picked !== q.answer)
      .map(
        ({ q, picked }) => `
        <li>
          <p class="quiz-wrong-prompt" lang="ja">${esc(q.prompt)}</p>
          <p>你的答案：<span class="quiz-wrong-pick" ${q.kind === 'grammar' ? 'lang="ja"' : ''}>${esc(q.options[picked])}</span></p>
          <p>正確答案：<span class="quiz-wrong-answer" ${q.kind === 'grammar' ? 'lang="ja"' : ''}>${esc(q.options[q.answer])}</span></p>
          ${q.kind === 'grammar' && q.explain ? `<p class="muted">${esc(q.explain)}</p>` : ''}
        </li>`,
      )
      .join('')

    return `
      <div class="panel quiz-result">
        <h2 tabindex="-1">測驗結果</h2>
        <p class="quiz-score"><strong>${correct}</strong> / ${total}</p>
        <p class="quiz-pct">${pct} 分</p>
        <p class="muted">${msg}</p>
        <div class="quiz-actions">
          <button type="button" class="btn btn-primary" data-action="start">再測一次</button>
          <button type="button" class="btn" data-action="setup">重新選題型</button>
        </div>
      </div>
      ${wrong ? `<div class="quiz-review"><h3>答錯的題目</h3><ul>${wrong}</ul></div>` : ''}`
  }

  function draw() {
    if (state.screen === 'setup') screen.innerHTML = setupHtml()
    else if (state.screen === 'question') screen.innerHTML = questionHtml()
    else screen.innerHTML = resultHtml()
  }

  // ---- 事件 ----

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button')
    if (!btn || btn.disabled) return
    if (btn.dataset.mode) {
      state.mode = btn.dataset.mode
      draw()
    } else if (btn.dataset.size != null) {
      state.size = Number(btn.dataset.size)
      draw()
    } else if (btn.dataset.option != null) {
      pick(Number(btn.dataset.option))
    } else if (btn.dataset.action === 'start') {
      start()
      screen.querySelector('.quiz-option')?.focus()
    } else if (btn.dataset.action === 'next') {
      next()
    } else if (btn.dataset.action === 'setup') {
      state.screen = 'setup'
      draw()
    }
  })

  function onKey(e) {
    if (state.screen !== 'question' || e.ctrlKey || e.metaKey || e.altKey) return
    if (e.target.closest?.('input, textarea, select')) return
    if (/^[1-9]$/.test(e.key) && state.picked === null) {
      e.preventDefault()
      pick(Number(e.key) - 1)
    } else if (e.key === 'Enter' && state.picked !== null && !e.target.closest?.('button, a')) {
      // 焦點在按鈕上時讓按鈕自己處理，避免一次跳兩題
      e.preventDefault()
      next()
    }
  }
  document.addEventListener('keydown', onKey)

  draw()
  return () => document.removeEventListener('keydown', onKey)
}
