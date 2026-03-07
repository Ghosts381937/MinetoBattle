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
