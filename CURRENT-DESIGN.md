# MinetoBattle Current Design（目前實作設計）

本文件描述 **目前程式實際已實作** 的遊戲設計與系統行為（以 `index.html`、`app.js`、`style.css` 為準）。

---

## 1. 遊戲核心循環

`商店 -> 召喚祭壇 -> 戰鬥 -> 掉落 -> 交易所/背包 -> 強化後再循環`

- 商店購買召喚石、補血藥、戰力藥劑。
- 召喚祭壇消耗召喚石生成敵人（含強敵機率）。
- 戰鬥可使用普攻/重擊/防禦/治療。
- 勝利後獲得素材、可能獲得進階元素與裝備。
- 在交易所出售物品換金，或在背包穿戴裝備提升屬性。

---

## 2. 畫面與分頁結構

主畫面包含 5 個分頁：

1. `商店`：購買道具。
2. `召喚祭壇`：召喚敵人。
3. `戰鬥`：對當前敵人執行行動。
4. `交易所`：出售素材/元素/未裝備裝備。
5. `背包`：查看素材、元素、裝備並穿戴。

頁首狀態列顯示：

- 金錢 `gold`
- 戰力 `power`
- 生命 `hp/hpMax`
- 防禦 `def`
- 層數 `stage`
- 召喚石 `summonStones`

---

## 3. 狀態模型（State）

主要狀態欄位：

- 經濟與戰鬥基礎：`gold`, `power`, `def`, `hp`, `hpMax`
- 暴擊：`critChance`, `critMult`
- 背包：`materials`, `elements`, `equipment`
- 裝備欄：`equipmentSlots = { weapon, armor, accessory }`
- 進度：`stage`, `stageProgress`, `stageTarget`
- 當前戰鬥：`currentEnemy`
- 戰鬥狀態：
  - `playerStatus.shield`
  - `enemyStatus.bleedingTurns`
  - `enemyStatus.stunnedTurns`

另外保留 `baseStats` 作為角色基礎屬性來源，裝備加成會在重算時疊加。

---

## 4. 商店設計

固定商品：

- `初級召喚石`（15）：`summonStones +1`
- `療傷藥`（20）：恢復 30 HP（不超過 `hpMax`）
- `戰力藥劑`（50）：`baseStats.power +2`，再重算角色總屬性

---

## 5. 關卡與敵人生成

### 5.1 敵人資料表（`ENEMY_PROFILES`）

目前 5 種敵人原型：史萊姆、哥布林、狼人、骷髏兵、暗影獸。

每個原型含：`id`, `name`, `type`, `baseHp`, `baseAtk`。

### 5.2 關卡成長規則（`getStageConfig`）

對任一層數 `s`：

- 目標擊殺數：`target = 3 + floor((s - 1) / 3)`
- 敵人血量倍率：`1 + (s - 1) * 0.15`
- 敵人攻擊倍率：`1 + (s - 1) * 0.12`
- 強敵機率：`min(0.15 + (s - 1) * 0.03, 0.4)`

### 5.3 強敵規則

若判定為強敵：

- HP 乘上 1.5
- ATK 額外 `+3`
- 防禦值較高（依層數）
- 名稱前綴 `【強敵】`
- 附帶詞綴（`AFFIXES`）

---

## 6. 戰鬥系統

### 6.1 玩家行動

- `普攻 attack`
  - 傷害倍率 `1.0`
- `重擊 heavy`
  - 傷害倍率 `1.7`
  - 自傷 5
  - 20% 機率給敵人 `stunnedTurns = 1`
  - 50% 機率給敵人 `bleedingTurns = 2`
- `防禦 defend`
  - 護盾增加：`5 + def`
- `治療 heal`
  - 回復 20（不超過 `hpMax`）

### 6.2 傷害計算

玩家傷害（`computePlayerDamage`）：

- 基礎：`power + random(0..2)`
- 套用行動倍率後四捨五入
- 暴擊判定：若觸發，傷害乘 `critMult`

敵人傷害（`computeEnemyDamage`）：

1. 基礎：`enemy.atk + random(-1..1)`（至少 1）
2. 先由玩家護盾吸收
3. 再扣除玩家防禦 `def`
4. 最終至少造成 1 傷害

### 6.3 回合流程

1. 玩家行動。
2. 若敵方仍存活且有流血，結算流血傷害（每次 2）。
3. 敵人死亡 -> 掉落 -> 清空當前敵人。
4. 敵人存活時：
   - 若暈眩中，跳過反擊。
   - 否則反擊玩家。
5. 若玩家 HP <= 0：玩家狀態重置為初始值並重新開始。

---

## 7. 掉落與成長

### 7.1 掉落內容（`giveDrops`）

每次勝利：

- 魔獸殘片（副產物）：`mat_1 ~ mat_4`，數量普通 1~2、強敵 1~3
- 強敵額外掉 1 個進階元素（火/水/風/土之一）
- 裝備掉落機率：普通 `30%`、強敵 `60%`

### 7.2 裝備資料模型

每件裝備包含：

- `id`, `slot`, `name`, `affix`, `power`, `stats`, `equipped`

`slot` 只會是：`weapon`, `armor`, `accessory`

裝備屬性規則：

- 武器：`stats.power = eqPower`
- 防具：`stats.def = floor(eqPower / 2)`、`stats.hpMax = eqPower * 5`
- 飾品：`stats.critChance = 0.02 * eqPower`

### 7.3 穿戴規則

- 同欄位一次只允許 1 件裝備。
- 穿戴新裝備會自動卸下同欄位舊裝。
- 每次穿戴後都會重算總屬性（基礎 + 裝備）。

---

## 8. 交易所規則

可出售：

- 魔獸殘片：每個 5 金（一次全賣）
- 元素：每個 15 金（一次全賣）
- 裝備：`10 + power * 3`

限制：

- 已裝備裝備不可直接賣出（按鈕 disabled）。

---

## 9. 層數進度與通關獎勵

每次擊敗敵人會推進 `stageProgress`。

當 `stageProgress >= stageTarget`：

- 發放通關金錢：`20 + stage * 5`
- 額外給 1 個隨機進階元素
- `stage +1`
- `stageProgress` 重置為 0
- `stageTarget` 依新層數重算

---

## 10. 技術結構

- 架構：單檔腳本 IIFE（`app.js`）
- 事件：按鈕 click handler + 分頁切換
- UI 更新：
  - `updateStats()` 更新頂部數值
  - `renderStore()` / `renderBattle()` / `renderExchange()` / `renderInventory()` 分區渲染
- 日誌：
  - 全域日誌 `gameLog`
  - 各分頁區域日誌（祭壇、戰鬥、交易所）

---

## 11. 目前設計邊界

- 無存檔/讀檔機制。
- 無正式職業/技能樹系統。
- 關卡為數值成長 + 擊殺目標機制，尚未實作獨立 Boss 腳本。
- 裝備目前以掉落與穿戴為主，尚未實作裝備強化介面。

---

## 12. 文件用途

本文件作為「目前版本」設計基準，供後續開發（第二階段功能）對照與擴充。
