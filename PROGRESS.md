# 開發進度

> 每完成一個功能就更新這份檔案。功能規格見 [PLAN.md](PLAN.md)。

最後更新：2026-11-03

## 開發流程

1. 一次只做一個功能。
2. 做完先在瀏覽器實際測試，確認正常。
3. `git commit` 並 `git push` 到 GitHub。
4. 更新這份 PROGRESS.md，列出剩下的工作。

## 第一階段

| 功能 | 狀態 | 備註 |
| --- | --- | --- |
| 專案架構 | ✅ 完成 | Vite vanilla、hash 路由、localStorage 存取（`src/storage.js`）、資料載入（`src/data.js`） |
| 單字卡 | ✅ 完成 | 翻卡、記住了／再複習、打亂順序、只看未記住的、鍵盤快捷鍵、深色模式、手機版 |
| 文法筆記 | ✅ 完成 | 11 個範例文法（N5～N1），可展開收合、依等級篩選、全部展開／收合 |
| 測驗 | ✅ 完成 | 題型：混合／單字選意思／文法填空；可選 5、10 題或全部；隨機出題、選項打亂；答完立刻顯示對錯和解說；結果頁有分數和答錯的題目；成績存進 `quizHistory`；鍵盤 1～4 作答、Enter 下一題 |
| 單字本 | ⬜ 未開始 | 新增／編輯／刪除自己的單字（存在 `myWords`），單字卡已經會讀取 |
| 首頁 | ⬜ 未開始 | 完成後把 `src/main.js` 的 `DEFAULT_ROUTE` 改回 `'home'` |
| 設定 | ⬜ 未開始 | 深色模式切換（`data-theme`）、清除學習紀錄；新增 `src/pages/settings.js` |
| 部署上線 | ⬜ 未開始 | |

## 第二階段（尚未開始）

章節分類、錯題本、間隔複習、發音、五十音

## 第三階段（尚未開始）

動詞變化、帳號同步、匯入匯出

## 技術備忘

- 頁面模組匯出 `render(root)`，可回傳清理函式（離開頁面時由 `main.js` 呼叫）。
- localStorage 鍵：`progress`、`myWords`、`quizHistory`、`settings`。
  - `progress` 格式：`{ 單字id: { known, reviews, lastReviewed: 'YYYY-MM-DD' } }`
- 顏色都定義在 `src/styles/base.css` 的 `:root` 變數，深色模式已支援 `data-theme='dark' / 'light'` 強制切換。
- 目前範例單字 12 個（第1課、第2課各 6 個）；範例文法 11 個（N5 3、N4 4、N3 2、N2 1、N1 1）。
- 文法資料多了 `level` 欄位（N1～N5），已同步到 PLAN.md 的資料結構範例。
- 題庫 `questions.json` 有 12 題文法填空（每個範例文法至少一題，用 `grammarId` 連到文法）；單字題由單字資料自動產生（含單字本的單字），錯誤選項從其他單字的意思隨機挑。
  - `quizHistory` 格式：`[{ date, mode: 'mixed'|'vocab'|'grammar', total, correct, wrongIds }]`，最多保留 100 筆；`wrongIds` 單字題是單字 id、文法題是題目 id，之後錯題本可以直接用。

## 完成紀錄

- 2026-11-03　專案初始化並推上 GitHub
- 2026-11-03　單字卡完成（`38b99f8`）
- 2026-11-03　文法筆記完成（含 N1～N5 等級，`c01ef78`）
- 2026-11-03　測驗完成
