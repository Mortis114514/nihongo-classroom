// 文法筆記：句型、接續、說明、例句、等級（N5～N1），可展開收合、依等級篩選
import { loadGrammar } from '../data.js'
import { escapeHtml as esc } from '../utils/shuffle.js'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

/** 由簡單到難排序（N5 → N1），沒有等級的放最後 */
function levelRank(level) {
  const i = LEVELS.indexOf(level)
  return i === -1 ? LEVELS.length : i
}

export async function render(root) {
  root.innerHTML = '<p class="muted">載入文法中…</p>'

  let items
  try {
    items = await loadGrammar()
  } catch (err) {
    console.error(err)
    root.innerHTML = '<p class="error">文法資料載入失敗，請重新整理頁面。</p>'
    return
  }
  if (!root.isConnected) return

  if (items.length === 0) {
    root.innerHTML = '<p class="muted">目前還沒有任何文法筆記。</p>'
    return
  }

  items = [...items].sort((a, b) => levelRank(a.level) - levelRank(b.level))

  const state = {
    level: 'all',
    open: new Set(), // 展開中的文法 id，切換篩選後保留
  }

  const count = (level) => items.filter((g) => g.level === level).length
  const chip = (value, label, n) => `
    <button type="button" class="chip" data-level="${value}" aria-pressed="false" ${n === 0 ? 'disabled' : ''}>
      ${label}<span class="chip-count">${n}</span>
    </button>`

  root.innerHTML = `
    <section class="grammar">
      <div class="toolbar">
        <div class="chips" role="group" aria-label="依等級篩選">
          ${chip('all', '全部', items.length)}
          ${LEVELS.map((lv) => chip(lv, lv, count(lv))).join('')}
        </div>
        <div class="toolbar-actions">
          <button type="button" class="btn" data-action="expand">全部展開</button>
          <button type="button" class="btn" data-action="collapse">全部收合</button>
        </div>
      </div>
      <div class="grammar-list" data-ref="list"></div>
    </section>
  `

  const list = root.querySelector('[data-ref="list"]')

  function visible() {
    return state.level === 'all' ? items : items.filter((g) => g.level === state.level)
  }

  function itemHtml(g) {
    const examples = (g.examples ?? [])
      .map(
        (ex) => `
          <li>
            <p lang="ja">${esc(ex.jp)}</p>
            ${ex.zh ? `<p class="muted">${esc(ex.zh)}</p>` : ''}
          </li>`,
      )
      .join('')

    return `
      <details class="gram-item" data-id="${esc(g.id)}" ${state.open.has(g.id) ? 'open' : ''}>
        <summary>
          ${g.level ? `<span class="badge badge-level">${esc(g.level)}</span>` : ''}
          <span class="gram-pattern" lang="ja">${esc(g.pattern)}</span>
          <span class="gram-gist">${esc(g.gist)}</span>
        </summary>
        <div class="gram-body">
          ${g.form ? `<h3>接續</h3><p lang="ja">${esc(g.form)}</p>` : ''}
          ${g.note ? `<h3>說明</h3><p>${esc(g.note)}</p>` : ''}
          ${examples ? `<h3>例句</h3><ul class="gram-examples">${examples}</ul>` : ''}
        </div>
      </details>`
  }

  function draw() {
    for (const btn of root.querySelectorAll('[data-level]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.level === state.level))
    }
    list.innerHTML = visible().map(itemHtml).join('')
  }

  function setAllOpen(open) {
    for (const el of list.querySelectorAll('.gram-item')) el.open = open
  }

  root.addEventListener('click', (e) => {
    const levelBtn = e.target.closest('[data-level]')
    if (levelBtn && !levelBtn.disabled) {
      state.level = levelBtn.dataset.level
      draw()
      return
    }
    const action = e.target.closest('[data-action]')?.dataset.action
    if (action === 'expand') setAllOpen(true)
    if (action === 'collapse') setAllOpen(false)
  })

  // toggle 事件不會冒泡，用捕獲階段統一記錄展開狀態
  root.addEventListener(
    'toggle',
    (e) => {
      const el = e.target
      if (!(el instanceof HTMLDetailsElement)) return
      if (el.open) state.open.add(el.dataset.id)
      else state.open.delete(el.dataset.id)
    },
    true,
  )

  draw()
}
