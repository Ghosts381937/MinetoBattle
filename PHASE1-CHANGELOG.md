## MinetoBattle 第一階段實作變更紀錄

本檔案紀錄依照 `PHASE1-ROADMAP.md` 完成的第一階段功能與程式結構調整。

---

### 一、敵人多樣化與關卡結構

- **新增敵人資料表 `ENEMY_PROFILES`**
  - 每個敵人包含 `id`, `name`, `type`, `baseHp`, `baseAtk`。
  - 目前實作基本類型：史萊姆、哥布林、狼人、骷髏兵、暗影獸。
- **重寫 `createEnemy(strong)`**
  - 由 `ENEMY_PROFILES` 隨機選擇一個基本型，依當前 `stage` 套用 HP / ATK 成長倍率。
  - 強敵會額外套用 1.5 倍 HP 與 +3 攻擊，並有額外防禦值與詞綴。
- **加入關卡 / 層數系統**
  - `state` 新增：
    - `stage`: 目前層數（起始 1）。
    - `stageProgress`: 本層已擊敗敵人數。
    - `stageTarget`: 本層目標敵人數，透過 `getStageConfig` 動態計算。
  - 新增 `getStageConfig(stage)` 與 `syncStageTarget()`：
    - 依層數回傳敵人 HP / ATK 成長倍率、強敵機率、目標擊殺數。
  - 新增 `advanceStageProgress()`：
    - 每次擊敗敵人後呼叫，累積 `stageProgress`。
    - 當達到 `stageTarget` 時，發放通關獎勵（金錢 + 進階元素），提升 `stage` 並重置進度。
    - 通關與獎勵會寫入戰鬥日誌與全域日誌。
- **強敵機率整合關卡**
  - `doSummon()` 不再直接使用固定的 `STRONG_ENEMY_CHANCE`，改由 `getStageConfig(stage).strongChance` 取得，並隨層數微幅提升（上限約 40%）。
  - 強敵召喚時在祭壇日誌中顯示警示文字，其餘召喚則標註當前層數。

---

### 二、戰鬥決策與狀態系統

- **戰鬥行動**
  - `index.html` 中原本單一的「攻擊」按鈕改為行動列：
    - `btnAttack`: 普攻。
    - `btnHeavy`: 重擊。
    - `btnDefend`: 防禦。
    - `btnHeal`: 治療。
  - 在 `app.js` 中新增 `performPlayerAction(action)`：
    - `attack`: 基礎傷害。
    - `heavy`: 較高倍率傷害，附帶自傷，並有機率造成暈眩與流血狀態。
    - `defend`: 累積護盾值，下一次受到攻擊時優先消耗。
    - `heal`: 回復固定生命值，上限為 `hpMax`。
  - 保留 `doAttack()` 名稱，改為呼叫 `performPlayerAction('attack')`，以維持舊有測試與相容性。
- **戰鬥狀態**
  - `state.battle` 新增：
    - `playerStatus.shield`: 玩家當前護盾值。
    - `enemyStatus.bleedingTurns`: 敵人尚餘流血回合數。
    - `enemyStatus.stunnedTurns`: 敵人尚餘暈眩回合數。
  - 新增 `resetBattleState()`：在每次召喚新敵人時重置雙方戰鬥狀態。
- **傷害與防禦計算**
  - 新增 `computePlayerDamage(multiplier)`：
    - 以 `state.power` 為基礎，加入隨機浮動與倍率，再根據 `critChance` 與 `critMult` 計算暴擊。
  - 新增 `computeEnemyDamage(enemy)`：
    - 以敵人 ATK 為基礎，加入少量隨機浮動。
    - 先結算玩家護盾（寫入戰鬥日誌），再扣除玩家防禦 `state.def`，確保最少造成 1 點傷害。
- **戰鬥流程**
  - 玩家執行行動（普攻 / 重擊 / 防禦 / 治療）。
  - 若敵人仍存活，先依 `bleedingTurns` 結算流血傷害。
  - 若敵人死亡：
    - 呼叫 `giveDrops()` 發放掉落。
    - 呼叫 `advanceStageProgress()`，可能觸發通關與獎勵。
  - 若敵人存活：
    - 若 `stunnedTurns > 0`，則本回合敵人跳過行動並扣除暈眩回合數。
    - 否則使用 `computeEnemyDamage()` 計算對玩家的傷害。
  - 若玩家 HP 歸 0 或以下：
    - 玩家 HP 設為 1，脫離戰鬥，維持原有設計行為。

---

### 三、角色屬性與裝備系統

- **角色屬性擴充**
  - `state` 新增：
    - `def`: 防禦。
    - `critChance`: 暴擊率。
    - `critMult`: 暴擊傷害倍率。
    - `baseStats`: 儲存原始基礎屬性（power / def / hpMax / critChance / critMult）。
  - 新增 `recalcStatsFromBaseAndEquipment()`：
    - 先從 `baseStats` 重設當前 `power / def / hpMax / critChance / critMult`。
    - 再將當前已裝備物的 `stats` 疊加上去。
    - 保證 `hp` 不會高於新的 `hpMax`。
  - 使用戰力藥劑時（`power_up`）：
    - 改為調整 `state.baseStats.power` 後呼叫 `recalcStatsFromBaseAndEquipment()`，確保裝備加成與基礎成長可以分開管理。
- **裝備欄位與穿戴邏輯**
  - `state` 新增：
    - `equipmentSlots`: `{ weapon, armor, accessory }`，對應三個裝備欄位。
  - 掉落裝備結構調整：
    - 每件掉落裝備包含 `id`, `slot`, `name`, `affix`, `power`, `stats`, `equipped`。
    - `slot` 會隨機等於 `weapon` / `armor` / `accessory`。
    - `stats` 依 `slot` 類型決定實際加成：
      - 武器：提升 `power`。
      - 防具：提升 `def` 與 `hpMax`。
      - 飾品：提升 `critChance`。
  - 新增 `equipItem(index)`：
    - 依索引取得裝備，依其 `slot` 將同欄位既有裝備標記為未裝備，並將該裝備標記為已裝備。
    - 更新 `state.equipmentSlots[slot]` 為當前裝備。
    - 呼叫 `recalcStatsFromBaseAndEquipment()` 與 `renderInventory()` / `updateStats()`。
- **背包與裝備 UI**
  - `renderInventory()` 中的裝備區重寫：
    - 上方顯示當前裝備欄位摘要（武器 / 防具 / 飾品）。
    - 下方列出背包中所有裝備，每件裝備顯示：
      - 類型（武器 / 防具 / 飾品）、名稱、詞綴、數值。
      - 「裝備」按鈕（已裝備的顯示為 disabled 的「已裝備」）。
  - CSS 新增：
    - `.equipped-summary`：顯示當前已裝備物品的簡要清單。
    - `.equip-row` / `.equip-btn`：用於裝備列表與按鈕的排版與風格。
- **交易所與裝備互動**
  - `renderExchange()` 僅列出尚未裝備的裝備（`eq.equipped === false`）。
  - 出售裝備時：
    - 若該裝備為已裝備狀態，會同步清空對應 `equipmentSlots` 欄位。
    - 呼叫 `recalcStatsFromBaseAndEquipment()` 以更新角色屬性。

---

### 四、UI 與狀態顯示更新

- **狀態列**
  - `index.html` 的玩家狀態列新增：
    - 防禦：`🛡 防禦: <strong id="def">0</strong>`。
    - 層數：`🏛 層數: <strong id="stage">1</strong>`。
  - `updateStats()` 會同步更新這兩個欄位。
- **戰鬥面板**
  - 新增提示文字，說明可使用多種戰鬥行動。
  - 戰鬥行動按鈕列使用 `.battle-actions` 以改善排版（在手機上會自動換行）。

---

### 五、測試與測試矩陣更新

- `**TEST-MATRIX.md`**
  - 新增條目：
    - 23：戰鬥行動（普攻、重擊、防禦、治療）。
    - 24：角色屬性與裝備（防禦、暴擊屬性、裝備欄位與穿戴）。
    - 25：關卡 / 層數（state 與通關獎勵邏輯）。
- `**test.js**`
  - HTML 結構測試：
    - `requiredIds` 新增 `def`, `stage`, `btnHeavy`, `btnDefend`, `btnHeal` 等必須存在的 id。
  - JS 結構檢查：
    - 新增檢查 `def`, `critChance`, `equipmentSlots` 存在，以確認角色屬性與裝備欄位已擴充。
    - 新增檢查 `performPlayerAction` 與多個戰鬥按鈕 id 是否存在，以確認多行動邏輯存在。
  - 原有檢查（例如 `doAttack`, `giveDrops`, `STRONG_ENEMY_CHANCE` 等）仍然保留，確保新功能向下相容。

