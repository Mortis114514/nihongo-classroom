// 啟動、切換分頁
import './styles/base.css'
import './styles/components.css'
import * as flashcards from './pages/flashcards.js'
import * as grammar from './pages/grammar.js'

// page 為空的分頁代表還沒完成，會顯示「開發中」
const routes = [
  { id: 'home', label: '首頁' },
  { id: 'flashcards', label: '單字卡', page: flashcards },
  { id: 'grammar', label: '文法筆記', page: grammar },
  { id: 'quiz', label: '測驗' },
  { id: 'wordbook', label: '單字本' },
]

// 首頁完成後改回 'home'
const DEFAULT_ROUTE = 'flashcards'

const app = document.querySelector('#app')
app.innerHTML = `
  <header class="site-header">
    <div class="container header-inner">
      <a class="logo" href="#/${DEFAULT_ROUTE}">日文小教室</a>
      <nav class="site-nav">
        ${routes.map((r) => `<a href="#/${r.id}" data-route="${r.id}">${r.label}</a>`).join('')}
      </nav>
    </div>
  </header>
  <main class="container" id="view"></main>
`

const view = document.querySelector('#view')
let cleanup = null

function navigate() {
  const id = location.hash.replace(/^#\/?/, '') || DEFAULT_ROUTE
  const route = routes.find((r) => r.id === id) ?? routes.find((r) => r.id === DEFAULT_ROUTE)

  cleanup?.()
  cleanup = null

  for (const link of app.querySelectorAll('[data-route]')) {
    if (link.dataset.route === route.id) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
  document.title = `${route.label}｜日文小教室`

  // 每次換分頁都給一個新的容器，舊分頁的非同步工作就不會畫到新分頁上
  const pageRoot = document.createElement('div')
  view.replaceChildren(pageRoot)

  if (!route.page) {
    pageRoot.innerHTML = `
      <div class="panel placeholder">
        <h2>${route.label}</h2>
        <p class="muted">這個功能還在開發中。</p>
      </div>`
    return
  }

  Promise.resolve(route.page.render(pageRoot)).then((fn) => {
    if (typeof fn !== 'function') return
    if (pageRoot.isConnected) cleanup = fn
    else fn() // 載入完成前已經離開這個分頁
  })
}

window.addEventListener('hashchange', navigate)
navigate()
