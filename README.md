# MinetoBattle

商店 → 召喚祭壇 → 戰鬥 → 交易所 → 循環升級。

## 設計文件

- 目前實作設計：`CURRENT-DESIGN.md`

## 執行方式

用瀏覽器直接開啟 `index.html`，或在本目錄執行：

```bash
npx serve .
# 或
python3 -m http.server 8080
```

然後開啟 http://localhost:8080（或 3000）。

## 自動測試

功能與測試對照見 **`TEST-MATRIX.md`**。

- **Node**（需安裝 Node.js）：`node test.js` — 檢查專案結構、HTML/CSS/JS、mock 執行、數值邏輯。
- **瀏覽器**：用本地伺服器開啟 `test.html`（例：`npx serve .` 後開 `/test.html`）— 自動執行商店購買、召喚、戰鬥、掉落、交易所、背包、分頁切換及「召喚石不足」提示等流程。

## CI（GitHub Actions）

- Workflow：`.github/workflows/ci.yml`
- 觸發時機：`push` 到 `main`、`pull_request` 到 `main`
- 內容：使用 Node.js 20 執行 `node test.js`

## 快速啟動（Client/Server 模式）

一行指令啟動本地伺服器：

```bash
npm install && npm start
```

伺服器預設監聽 `http://localhost:3000`。

## API 端點

| 方法   | 路徑               | 說明                               |
|--------|--------------------|------------------------------------|
| GET    | `/api/health`      | 伺服器健康檢查，回傳 `{ ok: true }` |
| POST   | `/api/save`        | 儲存遊戲狀態至伺服器               |
| GET    | `/api/load`        | 讀取伺服器端最新遊戲存檔           |
| GET    | `/api/leaderboard` | 取得排行榜（最高分前 10 名）       |
| POST   | `/api/leaderboard` | 提交分數至排行榜                   |

## Render 部署指南

1. 在 [Render](https://render.com) 建立新的 **Web Service**
2. 連結此 GitHub Repository
3. 設定如下：
   - **Build Command**：`npm install`
   - **Start Command**：`npm start`
   - **Environment**：Node
4. 點擊 **Deploy**，Render 會自動產生公開 URL

> 靜態資源（`index.html`、`style.css`、`app.js`）由 Express 伺服器直接提供，無需額外設定 CDN。
