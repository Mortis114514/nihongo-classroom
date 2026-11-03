// 單字卡：翻卡、標記記住了／再複習、打亂順序、只看未記住的
import { loadVocab } from '../data.js'
import { getProgress, markWord } from '../storage.js'
import { shuffle, escapeHtml as esc } from '../utils/shuffle.js'

export async function render(root) {
  root.innerHTML = '<p class="muted">載入單字中…</p>'

  let words
  try {
    words = await loadVocab()
  } catch (err) {
    console.error(err)
    root.innerHTML = '<p class="error">單字資料載入失敗，請重新整理頁面。</p>'
    return
  }
  if (!root.isConnected) return // 載入期間已切到別的分頁

  if (words.length === 0) {
    root.innerHTML = '<p class="muted">目前還沒有任何單字。</p>'
    return
  }

  const state = {
    order: words, // 目前的卡片順序（原順序或打亂後）
    shuffled: false,
    onlyUnknown: false,
    index: 0,
    flipped: false,
  }

  root.innerHTML = `
    <section class="flashcards">
      <div class="toolbar">
        <button type="button" class="btn" data-action="shuffle"></button>
        <label class="toggle">
          <input type="checkbox" data-ref="only-unknown" />
          只看未記住的
        </label>
        <span class="toolbar-stats" data-ref="stats"></span>
      </div>
      <div data-ref="stage"></div>
      <p class="hint">快捷鍵：空白鍵翻卡 ・ ← → 切換 ・ 1 再複習 ・ 2 記住了</p>
    </section>
  `

  const stage = root.querySelector('[data-ref="stage"]')
  const stats = root.querySelector('[data-ref="stats"]')
  const shuffleBtn = root.querySelector('[data-action="shuffle"]')
  const onlyUnknownBox = root.querySelector('[data-ref="only-unknown"]')

  /** 依照目前的順序和篩選，算出這一輪要看的卡片 */
  function deck() {
    if (!state.onlyUnknown) return state.order
    const progress = getProgress()
    return state.order.filter((w) => !progress[w.id]?.known)
  }

  function draw() {
    const progress = getProgress()
    const cards = deck()
    const knownCount = words.filter((w) => progress[w.id]?.known).length

    shuffleBtn.textContent = state.shuffled ? '恢復原順序' : '打亂順序'
    stats.textContent = `已記住 ${knownCount} / ${words.length}`

    if (cards.length === 0) {
      stage.innerHTML = `
        <div class="panel done">
          <h2>全部單字都記住了！</h2>
          <p class="muted">可以取消「只看未記住的」，把所有單字再複習一次。</p>
          <button type="button" class="btn btn-primary" data-action="show-all">顯示全部單字</button>
        </div>`
      return
    }

    if (state.index >= cards.length) {
      stage.innerHTML = `
        <div class="panel done">
          <h2>這一輪看完了</h2>
          <p class="muted">共 ${cards.length} 張，已記住 ${knownCount} 個單字。</p>
          <button type="button" class="btn btn-primary" data-action="restart">再來一輪</button>
        </div>`
      return
    }

    const w = cards[state.index]
    const known = Boolean(progress[w.id]?.known)
    const tags = (w.tags ?? []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')

    stage.innerHTML = `
      <div class="flashcard ${state.flipped ? 'is-flipped' : ''}" data-action="flip"
           role="button" tabindex="0" aria-label="翻卡，目前顯示${state.flipped ? '背面' : '正面'}">
        <div class="flashcard-inner">
          <div class="flashcard-face front">
            <div class="fc-meta">
              <span class="tags">${tags}</span>
              ${known ? '<span class="badge badge-known">已記住</span>' : ''}
            </div>
            <div class="fc-word" lang="ja">${esc(w.word)}</div>
            <div class="fc-hint">點一下翻面</div>
          </div>
          <div class="flashcard-face back">
            <div class="fc-kana" lang="ja">${esc(w.kana)}</div>
            <div class="fc-meaning">${esc(w.meaning)}</div>
            ${
              w.example
                ? `<div class="fc-example">
                     <p lang="ja">${esc(w.example)}</p>
                     ${w.exampleZh ? `<p class="muted">${esc(w.exampleZh)}</p>` : ''}
                   </div>`
                : ''
            }
          </div>
        </div>
      </div>

      <div class="fc-nav">
        <button type="button" class="btn" data-action="prev" ${state.index === 0 ? 'disabled' : ''}>← 上一張</button>
        <span class="fc-count">${state.index + 1} / ${cards.length}</span>
        <button type="button" class="btn" data-action="next">下一張 →</button>
      </div>

      <div class="fc-mark">
        <button type="button" class="btn btn-review" data-action="review">再複習</button>
        <button type="button" class="btn btn-known" data-action="known">記住了</button>
      </div>
    `
  }

  function flip() {
    const card = stage.querySelector('.flashcard')
    if (!card) return
    state.flipped = !state.flipped
    card.classList.toggle('is-flipped', state.flipped)
    card.setAttribute('aria-label', `翻卡，目前顯示${state.flipped ? '背面' : '正面'}`)
  }

  function go(delta) {
    const next = state.index + delta
    if (next < 0 || next > deck().length) return
    state.index = next
    state.flipped = false
    draw()
  }

  function mark(known) {
    const w = deck()[state.index]
    if (!w) return
    markWord(w.id, known)
    // 「只看未記住的」時，記住的卡會從這一輪移除，所以位置不用往後
    if (!(known && state.onlyUnknown)) state.index++
    state.flipped = false
    draw()
  }

  function restart() {
    if (state.shuffled) state.order = shuffle(words)
    state.index = 0
    state.flipped = false
    draw()
  }

  const actions = {
    flip,
    prev: () => go(-1),
    next: () => go(1),
    known: () => mark(true),
    review: () => mark(false),
    restart,
    shuffle: () => {
      state.shuffled = !state.shuffled
      state.order = state.shuffled ? shuffle(words) : words
      state.index = 0
      state.flipped = false
      draw()
    },
    'show-all': () => {
      state.onlyUnknown = false
      onlyUnknownBox.checked = false
      restart()
    },
  }

  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]')
    if (el && !el.disabled) actions[el.dataset.action]?.()
  })

  onlyUnknownBox.addEventListener('change', () => {
    state.onlyUnknown = onlyUnknownBox.checked
    state.index = 0
    state.flipped = false
    draw()
  })

  function onKeydown(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    if (e.target instanceof Element && e.target.closest('input, textarea, select')) return

    const keyMap = {
      ' ': flip,
      ArrowLeft: () => go(-1),
      ArrowRight: () => go(1),
      1: () => mark(false),
      2: () => mark(true),
    }
    if (e.key === 'Enter' && e.target instanceof Element && e.target.classList.contains('flashcard')) {
      keyMap.Enter = flip
    }

    const handler = keyMap[e.key]
    if (!handler) return
    e.preventDefault()
    handler()
  }
  document.addEventListener('keydown', onKeydown)

  draw()

  // 離開這個分頁時，由 main.js 呼叫來移除鍵盤監聽
  return () => document.removeEventListener('keydown', onKeydown)
}
