# MinetoBattle Current Design（目前實作設計）

本文件描述目前 `main` 分支已實作內容（Phase 1 + Phase 2 + Phase 3）。

---

## 1. 核心循環

`商店/特殊商店 → 戰鬥分頁（無怪時召喚；有怪時戰鬥）→ 掉落 → 交易所/背包/任務成就/天賦 → 循環`

---

## 2. 主要介面結構

目前分頁：

1. 商店
2. 戰鬥（含召喚區）
3. 交易所
4. 背包
5. 任務
6. 成就
7. 圖鑑
8. 天賦
9. 排行榜

### 2.1 狀態資訊分層（最新 UI）

- 頂部常駐：`gold`, `power`, `hp/hpMax`, `def`, `gems`
- 戰鬥分頁（無敵人時召喚區）顯示：`summonStones`, `eliteStones`, `elementStones`
- 戰鬥區顯示：`stage`, `stageProgress/stageTarget` 與戰鬥操作

---

## 3. 狀態模型（State）

### 3.1 基礎戰鬥與經濟

- `gold`, `power`, `def`, `critChance`, `critMult`, `hp`, `hpMax`
- `baseStats`（基礎屬性）

### 3.2 戰鬥與關卡

- `currentEnemy`
- `stage`, `stageProgress`, `stageTarget`
- `battle.playerStatus.shield`
- `battle.enemyStatus.bleedingTurns`, `battle.enemyStatus.stunnedTurns`

### 3.3 物品與裝備

- `materials`（魔獸殘片）
- `elements`（進階元素）
- `equipment`
- `equipmentSlots = { weapon, armor, accessory }`

### 3.4 Phase 2 系統

- 稀有貨幣/召喚石：`gems`, `eliteStones`, `elementStones`
- 進度統計：`stats.totalKills`, `stats.strongKills`, `stats.totalPurchases`
- 任務/成就狀態：`questClaimed`, `achClaimed`
- 收集狀態：`encountered`, `collectedAffixes`
- 特殊商店刷新：`shopRefreshIndex`

### 3.5 Phase 3 系統

- 新手提示：`seenTips`
- 日誌篩選：`logFilter`
- 劇情領取狀態：`storylineClaimed`
- 天賦：`talentPoints`, `talentSpec`, `talentAlloc`
- 離線收益時間戳：`lastSaveTime`

---

## 4. 商店與貨幣

### 4.1 一般商店（gold）

- 初級召喚石（15）
- 療傷藥（20）
- 戰力藥劑（50）

### 4.2 特殊商店（gold / gems）

- 精英召喚石（gems）
- 元素召喚石（gems）
- 生命/防禦/暴擊強化藥劑（gold）

特殊商店支援刷新（可用金幣刷新商品池）。

---

## 5. 召喚系統

### 5.1 召喚類型

- 普通召喚：消耗 `summonStones`
- 精英召喚：消耗 `eliteStones`，強敵率更高、掉落更好
- 元素召喚：消耗 `elementStones`，元素掉落更有利

### 5.2 敵人基礎資料

敵人原型：史萊姆、哥布林、狼人、骷髏兵、暗影獸。

欄位：`id`, `name`, `type`, `baseHp`, `baseAtk`。

---

## 6. 關卡與難度曲線

`getStageConfig(stage)` 主要規則：

- 目標擊殺數：`3 + floor((stage - 1) / 3)`
- 敵人血量倍率：`1 + (stage - 1) * 0.15`
- 敵人攻擊倍率：`1 + (stage - 1) * 0.12`
- 強敵機率：上限 40%

通關層數後給予金幣與元素獎勵，並推進下一層。

---

## 7. 戰鬥系統

### 7.1 行動

- 普攻
- 重擊（高傷害 + 自傷，且可附帶暈眩/流血）
- 防禦（獲得護盾）
- 治療

### 7.2 計算重點

- 玩家傷害：受 `power`、暴擊、倍率、天賦影響
- 敵方傷害：先吃護盾，再扣防禦，保底 1 傷
- 狀態效果：`bleeding`、`stunned`、`shield`

### 7.3 戰鬥回饋（Phase 3）

- 傷害/治療浮字特效（`spawnFloat`）
- 戰鬥與掉落訊息更完整

---

## 8. 掉落、背包、交易所

### 8.1 掉落

- 魔獸殘片（副產物）
- 進階元素
- 裝備（依召喚/敵人條件影響機率）

### 8.2 裝備

裝備欄位：`weapon`, `armor`, `accessory`，同欄位互斥穿戴。

裝備影響 `power / def / hpMax / critChance` 等屬性。

### 8.3 交易所

- 賣魔獸殘片、元素、未裝備裝備換金幣
- 已裝備裝備不可直接賣出

---

## 9. 任務與成就（Phase 2）

### 9.1 日常任務

範例條件：

- 擊敗怪物
- 擊敗強敵
- 抵達指定層數
- 購買指定次數

獎勵：金幣、靈晶等。

### 9.2 長期成就

範例條件：

- 擊敗怪物總數
- 抵達高層
- 遭遇所有怪物類型

獎勵：金幣、靈晶，一次性領取。

---

## 10. 圖鑑（Phase 2）

- 記錄遭遇過的怪物類型
- 記錄收集到的裝備詞綴
- 形成收集進度回饋

---

## 11. Phase 3 體驗系統

### 11.1 新手提示

- 商店、戰鬥（含召喚提示）、天賦分頁有一次性提示氣泡

### 11.2 日誌分類

- 全域日誌可依分類檢視（system / battle / loot）

### 11.3 劇情節點

- 目前已實作主要節點：第 10 層、第 20 層
- 觸發後顯示劇情 modal 與獎勵

### 11.4 天賦系統

- 三職業：戰士 / 刺客 / 法師
- 每職業至少兩項天賦
- 天賦影響攻擊、防禦、生命、暴擊、流血機率、元素掉落等

### 11.5 離線收益

- 依離線時間與進度給予資源
- 設有最低觸發門檻與上限（避免無限膨脹）

---

## 12. 重置與保留策略

玩家死亡會重置基礎戰鬥狀態，但保留重要長線進度（如任務/成就/圖鑑、靈晶與 Phase 3 相關狀態）。

---

## 13. 測試與 CI

- Node 測試：`node test.js`
- 測試矩陣：`TEST-MATRIX.md`
- CI：GitHub Actions（push / pull_request 到 `main` 時執行）

---

## 14. Client/Server 架構（MVP）

- 目前為單一 Node/Express 服務：同時提供前端靜態檔與 API。
- 主要 API：
	- `GET /api/health`
	- `POST /api/save`
	- `GET /api/load`
	- `GET /api/leaderboard`
	- `POST /api/leaderboard`
- 後端資料目前採 JSON file（`data/saves.json`, `data/leaderboard.json`）。
- 前端有 server 優先 + localStorage fallback 的存檔策略。

---

## 15. 文件定位

本文件作為「目前可玩版本」的設計基線，後續功能調整請同步更新本檔。
