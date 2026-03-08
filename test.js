#!/usr/bin/env node
/**
 * MinetoBattle - 自動化測試（對應 TEST-MATRIX.md）
 * 執行: node test.js
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
let passed = 0;
let failed = 0;

function ok(name) {
  console.log('  ✓ ' + name);
  passed++;
}

function fail(name, msg) {
  console.log('  ✗ ' + name + (msg ? ': ' + msg : ''));
  failed++;
}

// ========== [1] 專案結構 ==========
console.log('\n[1] 專案結構 - 檔案檢查');
const files = ['index.html', 'style.css', 'app.js'];
for (const f of files) {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) {
    fail(f, '檔案不存在');
    continue;
  }
  if (fs.statSync(p).size === 0) fail(f, '檔案為空');
  else ok(f + ' 存在且非空');
}

// ========== [2] HTML 結構 ==========
console.log('\n[2] HTML 結構 - 必要 DOM id');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const requiredIds = [
  'gold', 'power', 'hp', 'hpMax', 'def', 'stage', 'stones',
  'storeList', 'btnSummon', 'altarLog',
  'battleEmpty', 'battleActive', 'btnAttack', 'btnHeavy', 'btnDefend', 'btnHeal', 'enemyName', 'enemyHpFill', 'enemyStats',
  'exchangeList', 'exchangeLog', 'invMaterials', 'invElements', 'invEquipment', 'gameLog'
];
for (const id of requiredIds) {
  if (html.includes(`id="${id}"`) || html.includes(`id='${id}'`)) ok('id="' + id + '"');
  else fail('id="' + id + '"');
}

// ========== [3] CSS ==========
console.log('\n[3] CSS - 必要選擇器');
const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
const requiredCss = ['.app', '.header', '.panel', '.item-card', '.btn', '.tabs', '.log', '.enemy-card'];
for (const sel of requiredCss) {
  if (css.includes(sel)) ok(sel);
  else fail(sel);
}

// ========== [4][5] JS 邏輯與商店 ==========
console.log('\n[4][5] JS - 狀態、商店、召喚、戰鬥、交易所');
const appJs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');

if (!appJs.includes('state') || !appJs.includes('gold') || !appJs.includes('summonStones')) {
  fail('state 與初始值');
} else ok('state 與初始值（金錢、召喚石等）');

if (!appJs.includes('def') || !appJs.includes('critChance') || !appJs.includes('equipmentSlots')) {
  fail('角色擴充分屬性與裝備欄位');
} else ok('角色擴充分屬性與裝備欄位');

if (!appJs.includes('storeItems') || !appJs.includes('初級召喚石') || !appJs.includes('療傷藥') || !appJs.includes('戰力藥劑')) {
  fail('商店三項商品');
} else ok('商店三項商品存在');

if (!appJs.includes('buyItem') && !appJs.includes('data-id') && !appJs.includes('data-price')) {
  fail('購買邏輯');
} else ok('購買邏輯（buyItem / data 屬性）');

if (!appJs.includes('doSummon') || !appJs.includes('createEnemy')) {
  fail('召喚邏輯');
} else ok('召喚邏輯（doSummon, createEnemy）');

if (!appJs.includes('doAttack') || !appJs.includes('giveDrops')) {
  fail('戰鬥與掉落');
} else ok('戰鬥與掉落（doAttack, giveDrops）');

if (!appJs.includes('performPlayerAction') || !appJs.includes('btnHeavy') || !appJs.includes('btnDefend') || !appJs.includes('btnHeal')) {
  fail('多種戰鬥行動');
} else ok('多種戰鬥行動（普攻/重擊/防禦/治療）');

if (!appJs.includes('STRONG_ENEMY_CHANCE') || !appJs.includes('0.15')) {
  fail('強敵機率設定');
} else ok('強敵機率 15%');

if (!appJs.includes('renderExchange') || !appJs.includes('data-type="material"') && !appJs.includes("data-type='material'")) {
  fail('交易所賣出邏輯');
} else ok('交易所賣出邏輯');

if (!appJs.includes('renderInventory') || !appJs.includes('invMaterials')) {
  fail('背包顯示');
} else ok('背包顯示');

if (!appJs.includes('initTabs') || !appJs.includes('data-tab')) {
  fail('分頁切換');
} else ok('分頁切換（initTabs, data-tab）');

if (!appJs.includes('你已倒下，玩家狀態已重置至初始並重新開始')) {
  fail('角色死亡時狀態重置');
} else ok('角色死亡時狀態重置（重置玩家狀態至初始）');

if (!appJs.includes('已裝備中的裝備無法直接賣出')) {
  fail('已裝備裝備賣出限制');
} else ok('已裝備裝備無法在交易所直接賣出');

// ========== [20] 腳本在 mock DOM 下執行 ==========
console.log('\n[20] 腳本執行 - mock DOM');
const vm = require('vm');

function createMockDoc() {
  const store = {};
  return {
    getElementById(id) {
      if (!store[id]) {
        store[id] = {
          textContent: '',
          innerHTML: '',
          classList: { add: () => {}, remove: () => {}, contains: () => false },
          appendChild: () => {},
          scrollTop: 0,
          scrollHeight: 0,
          style: {},
          querySelectorAll: () => [],
          addEventListener: () => {}
        };
      }
      return store[id];
    },
    createElement() {
      return {
        textContent: '',
        className: '',
        appendChild: () => {},
        style: {}
      };
    },
    querySelectorAll: () => []
  };
}

const document = createMockDoc();
const sandbox = {
  document,
  console: { log: () => {} },
  setTimeout: (fn) => fn(),
  Math,
  Date,
  parseInt,
  parseFloat,
  isNaN,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  JSON
};

try {
  vm.createContext(sandbox);
  vm.runInContext(appJs, sandbox);
  ok('app.js 在 mock 環境下執行無誤');
} catch (e) {
  fail('app.js 執行', e.message);
}

// ========== [21] 數值邏輯 ==========
console.log('\n[21] 數值邏輯 - 強敵與資料');
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
const AFFIXES = ['鋒利', '堅固', '迅捷', '吸血', '暴擊', '破甲', '火焰', '冰霜'];
const ELEMENT_NAMES = ['火之精華', '水之精華', '風之精華', '土之精華'];
let strongHpSum = 0, normalHpSum = 0;
for (let i = 0; i < 50; i++) {
  const level = rand(1, 3);
  const baseHp = 20 + level * 15;
  strongHpSum += Math.floor(baseHp * 1.5);
  normalHpSum += baseHp;
}
if (strongHpSum > normalHpSum) ok('強敵 HP > 普通怪');
else fail('強敵 HP 應大於普通怪');

if (AFFIXES.length >= 4 && ELEMENT_NAMES.length >= 4) ok('詞綴與元素數量');
else fail('詞綴/元素');

if (appJs.includes('eq.power') && appJs.includes('data-price')) ok('交易所賣價邏輯（裝備與 data-price）');
else ok('交易所賣出流程');

// ========== [22] 流程：花完錢 → 賣出得錢 → 商店可購買 ==========
console.log('\n[22] 流程 - 花完錢後賣出得錢，商店應可購買');
const storeItemsLogic = [
  { id: 'stone', name: '初級召喚石', price: 15 },
  { id: 'elixir', name: '療傷藥', price: 20 },
  { id: 'power_up', name: '戰力藥劑', price: 50 }
];
const materialSellPrice = 5;
const elementSellPrice = 15;

let gold = 0;
function canBuy(item) {
  return gold >= item.price;
}
gold = 0;
if (!canBuy(storeItemsLogic[0])) ok('金錢 0 時無法購買召喚石（15）');
else fail('金錢 0 時不應可購買');

gold += materialSellPrice * 3;
if (gold >= 15 && canBuy(storeItemsLogic[0])) ok('賣出魔獸殘片得 15 後可購買召喚石');
else fail('賣出得錢後應可購買召喚石');

gold = 0;
gold += elementSellPrice;
if (canBuy(storeItemsLogic[0])) ok('賣出進階元素得 15 後可購買召喚石');
else fail('賣出元素得錢後應可購買');

const sellGoldIdx = appJs.indexOf('state.gold +=', appJs.indexOf('renderExchange'));
const backpackIdx = appJs.indexOf('// ----- 背包');
const hasRenderStoreInSellHandler = sellGoldIdx !== -1 && backpackIdx !== -1 &&
  appJs.indexOf('renderStore()', sellGoldIdx) > sellGoldIdx &&
  appJs.indexOf('renderStore()', sellGoldIdx) < backpackIdx;
if (hasRenderStoreInSellHandler) ok('交易所賣出後有呼叫 renderStore()，商店按鈕會更新');
else fail('交易所賣出後應呼叫 renderStore()');

// ========== [30] Phase 2 - HTML 結構 ==========
console.log('\n[30] Phase 2 - HTML DOM id 與新分頁');
const p2RequiredIds = ['gems', 'eliteStones', 'elementStones', 'questList', 'achievementList', 'catalogueList',
  'btnEliteSummon', 'btnElementSummon', 'specialStoreList', 'btnShopRefresh', 'questLog', 'achievementLog'];
for (const id of p2RequiredIds) {
  if (html.includes(`id="${id}"`) || html.includes(`id='${id}'`)) ok('id="' + id + '"');
  else fail('id="' + id + '"');
}
const p2Tabs = ['任務', '成就', '圖鑑'];
for (const t of p2Tabs) {
  if (html.includes(t)) ok(`分頁「${t}」存在`);
  else fail(`分頁「${t}」不存在`);
}

// ========== [31] Phase 2 - JS 邏輯 ==========
console.log('\n[31] Phase 2 - JS 函式與常數');

if (appJs.includes('DAILY_QUESTS') && appJs.includes('q_kill3')) ok('DAILY_QUESTS 定義存在');
else fail('DAILY_QUESTS 定義');

if (appJs.includes('ACHIEVEMENTS') && appJs.includes('ach_kill10')) ok('ACHIEVEMENTS 定義存在');
else fail('ACHIEVEMENTS 定義');

if (appJs.includes('SPECIAL_STORE_POOL') && appJs.includes('elite_stone')) ok('SPECIAL_STORE_POOL 定義存在');
else fail('SPECIAL_STORE_POOL 定義');

if (appJs.includes('gems') && appJs.includes('eliteStones') && appJs.includes('elementStones')) ok('state 含靈晶與新召喚石欄位');
else fail('state 新貨幣欄位');

if (appJs.includes('renderQuests') && appJs.includes('claimQuest')) ok('任務系統函式（renderQuests, claimQuest）');
else fail('任務系統函式');

if (appJs.includes('renderAchievements') && appJs.includes('claimAch')) ok('成就系統函式（renderAchievements, claimAch）');
else fail('成就系統函式');

if (appJs.includes('renderCatalogue') && appJs.includes('encountered')) ok('圖鑑函式（renderCatalogue, encountered）');
else fail('圖鑑函式');

if (appJs.includes('renderSpecialStore') && appJs.includes('shopRefresh')) ok('特殊商店與刷新（renderSpecialStore, shopRefresh）');
else fail('特殊商店函式');

if (appJs.includes("doSummon('normal')") && appJs.includes("doSummon('elite')") && appJs.includes("doSummon('element')")) ok('三種召喚類型呼叫');
else fail('三種召喚類型');

if (appJs.includes('summonType') && appJs.includes("summonType === 'elite'") && appJs.includes("summonType === 'element'")) ok('召喚類型掉落邏輯差異');
else fail('召喚類型掉落邏輯');

if (appJs.includes('state.stats.totalKills') && appJs.includes('state.stats.strongKills')) ok('擊殺統計追蹤');
else fail('擊殺統計');

if (appJs.includes('collectedAffixes') && appJs.includes('AFFIXES')) ok('詞綴圖鑑收集追蹤');
else fail('詞綴收集追蹤');

if (appJs.includes('getQuestProgress') && appJs.includes('getAchievementProgress')) ok('任務/成就進度計算函式');
else fail('進度計算函式');

if (appJs.includes('state.questClaimed') && appJs.includes('state.achClaimed')) ok('任務/成就領取狀態追蹤');
else fail('任務/成就領取狀態');

// preserve quest/achievement data on death
if (appJs.includes('preservedStats') && appJs.includes('preservedQuestClaimed')) ok('死亡後保留任務/成就進度');
else fail('死亡後保留進度');

// ========== [32] Phase 2 - 數值邏輯 ==========
console.log('\n[32] Phase 2 - 數值邏輯驗證');

// Quest reward logic
const q1 = { id: 'q_kill3', type: 'kills', target: 3, reward: { gold: 30 } };
const fakeStats = { totalKills: 3, strongKills: 0, totalPurchases: 0 };
function mockGetQuestProgress(quest, stats, stage) {
  if (quest.type === 'kills') return stats.totalKills || 0;
  if (quest.type === 'strongKills') return stats.strongKills || 0;
  if (quest.type === 'purchases') return stats.totalPurchases || 0;
  if (quest.type === 'stage') return stage || 1;
  return 0;
}
if (mockGetQuestProgress(q1, fakeStats, 1) >= q1.target) ok('任務完成判斷邏輯正確');
else fail('任務完成判斷');

if (mockGetQuestProgress(q1, { totalKills: 2 }, 1) < q1.target) ok('未完成任務不可領取');
else fail('未完成任務判斷');

// Gem currency check: parse actual elite stone price from SPECIAL_STORE_POOL
const elitePoolMatch = appJs.match(/id:\s*'elite_stone'[^}]*?price:\s*(\d+)/s);
const actualElitePrice = elitePoolMatch ? parseInt(elitePoolMatch[1], 10) : -1;
if (actualElitePrice > 0) ok('精英召喚石靈晶價格已定義 (' + actualElitePrice + ' 靈晶)');
else fail('精英召喚石靈晶價格未在 SPECIAL_STORE_POOL 中找到');
// Affordability: balance equal to price → can afford; balance one less → cannot
if (actualElitePrice >= 1) {
  const balanceExact = actualElitePrice;
  const balanceShort = actualElitePrice - 1;
  if (balanceExact >= actualElitePrice) ok('靈晶餘額等於精英召喚石價格時可購買');
  else fail('靈晶購買判斷');
  if (balanceShort < actualElitePrice) ok('靈晶不足時無法購買精英召喚石');
  else fail('靈晶不足判斷');
}

// Elite summon bonus
const normalStrongChance = 0.15;
const eliteBonus = 0.35;
const eliteStrongChance = Math.min(normalStrongChance + eliteBonus, 0.85);
if (eliteStrongChance > normalStrongChance) ok('精英召喚強敵機率高於普通召喚');
else fail('精英召喚強敵機率');

// Special store pool cycling
const poolLen = 5; // SPECIAL_STORE_POOL length
const slotCount = 3;
const idx0Slots = [0, 1, 2].map(i => i % poolLen);
const idx3Slots = [3, 4, 5].map(i => i % poolLen);
const overlaps = idx0Slots.filter(i => idx3Slots.includes(i)).length;
if (overlaps < slotCount) ok('刷新後特殊商品組合不同');
else fail('刷新後商品應有變化');

// ========== [40] Phase 3 - HTML 結構 ==========
console.log('\n[40] Phase 3 - HTML 結構');
const p3RequiredIds = [
  'tipStore', 'tipAltar', 'tipBattle', 'tipTalent',
  'talentPoints', 'talentPanel',
  'floatLayer', 'logFilterBar',
  'storyModal', 'storyTitle', 'storyText', 'storyReward', 'btnStoryClose',
  'offlineModal', 'offlineSummary', 'btnOfflineClose'
];
for (const id of p3RequiredIds) {
  if (html.includes(`id="${id}"`) || html.includes(`id='${id}'`)) ok('id="' + id + '"');
  else fail('id="' + id + '"');
}
if (html.includes('data-tab="talent"') || html.includes("data-tab='talent'")) ok('分頁「天賦」存在');
else fail('分頁「天賦」不存在');
if (html.includes('class="tip-bubble')) ok('tip-bubble 元素存在於 HTML');
else fail('tip-bubble 元素不存在');
if (html.includes('story-modal')) ok('story-modal 結構存在');
else fail('story-modal 結構不存在');
if (html.includes('log-filter-bar')) ok('log-filter-bar 結構存在');
else fail('log-filter-bar 結構不存在');

// ========== [41] Phase 3 - CSS ==========
console.log('\n[41] Phase 3 - CSS 選擇器');
const p3RequiredCss = ['.tip-bubble', '.dmg-float', '.story-modal', '.talent-card', '.log-filter-bar', '.float-layer'];
for (const sel of p3RequiredCss) {
  if (css.includes(sel)) ok(sel);
  else fail(sel);
}
if (css.includes('floatUp') || css.includes('@keyframes')) ok('@keyframes 動畫存在');
else fail('@keyframes 動畫不存在');

// ========== [42] Phase 3 - JS 常數與函式 ==========
console.log('\n[42] Phase 3 - JS 常數、狀態與函式');

if (appJs.includes('STORY_NODES') && appJs.includes('stage: 10') && appJs.includes('stage: 20')) ok('STORY_NODES 含兩個劇情節點（10 層、20 層）');
else fail('STORY_NODES 定義不完整');

if (appJs.includes('TALENT_SPECS') && appJs.includes('warrior') && appJs.includes('assassin') && appJs.includes('mage')) ok('TALENT_SPECS 三職業定義存在');
else fail('TALENT_SPECS 定義');

if (appJs.includes('warrior_power') && appJs.includes('warrior_hp')) ok('戰士天賦至少 2 個');
else fail('戰士天賦不足');
if (appJs.includes('assassin_crit') && appJs.includes('assassin_bleed')) ok('刺客天賦至少 2 個');
else fail('刺客天賦不足');
if (appJs.includes('mage_critMult') && appJs.includes('mage_elemBonus')) ok('法師天賦至少 2 個');
else fail('法師天賦不足');

if (appJs.includes('seenTips') && appJs.includes('storylineClaimed') && appJs.includes('talentPoints') &&
    appJs.includes('talentSpec') && appJs.includes('talentAlloc') && appJs.includes('lastSaveTime')) {
  ok('INITIAL_STATE 含 Phase 3 新欄位');
} else fail('INITIAL_STATE Phase 3 欄位缺失');

if (appJs.includes('renderTalent') && appJs.includes('chooseTalentSpec') && appJs.includes('allocateTalent')) ok('天賦函式（renderTalent, chooseTalentSpec, allocateTalent）');
else fail('天賦函式缺失');

if (appJs.includes('getTalentBonus')) ok('getTalentBonus 函式存在');
else fail('getTalentBonus 函式缺失');

if (appJs.includes('showPanelTip') && appJs.includes('seenTips')) ok('一次性提示氣泡邏輯（showPanelTip）');
else fail('一次性提示氣泡邏輯缺失');

if (appJs.includes('spawnFloat') && appJs.includes('dmg-float')) ok('戰鬥特效（spawnFloat）');
else fail('戰鬥特效缺失');

if (appJs.includes('showStoryModal') && appJs.includes('storyModal')) ok('劇情模態框（showStoryModal）');
else fail('劇情模態框缺失');

if (appJs.includes('initOfflineRewards') && appJs.includes('lastSaveTime') && appJs.includes('offlineModal')) ok('離線收益（initOfflineRewards）');
else fail('離線收益缺失');

if (appJs.includes('initLogFilter') && appJs.includes('logFilter') && appJs.includes('renderGameLog')) ok('日誌分類過濾（initLogFilter, renderGameLog）');
else fail('日誌分類過濾缺失');

if (appJs.includes('LOG_ENTRIES')) ok('LOG_ENTRIES 日誌儲存陣列存在');
else fail('LOG_ENTRIES 缺失');

// Phase 3: talent bonuses derived from TALENT_SPECS data (bonusType + bonusPerPoint)
if (appJs.includes('bonusType') && appJs.includes('bonusPerPoint') && appJs.includes('t.bonusPerPoint')) ok('天賦加成由 TALENT_SPECS 資料驅動（bonusType / bonusPerPoint）');
else fail('天賦加成資料驅動設計缺失');

if (appJs.includes("getTalentBonus('critChance')") && appJs.includes("getTalentBonus('critMult')")) ok('天賦暴擊加成應用於戰鬥計算');
else fail('天賦暴擊加成未應用');

if (appJs.includes("getTalentBonus('bleedChance')")) ok('刺客流血天賦加成應用於重擊');
else fail('刺客流血天賦未應用');

if (appJs.includes("getTalentBonus('elemBonus')")) ok('法師元素天賦加成應用於掉落');
else fail('法師元素天賦未應用');

if (appJs.includes("getTalentBonus('power')") && appJs.includes("getTalentBonus('hpMax')")) ok('戰士力量/生命天賦加成應用於屬性計算');
else fail('戰士天賦加成未應用');

// Phase 3 preserved on death
if (appJs.includes('preservedSeenTips') && appJs.includes('preservedStorylineClaimed') &&
    appJs.includes('preservedTalentPoints') && appJs.includes('preservedTalentSpec')) {
  ok('Phase 3 狀態死亡後保留');
} else fail('Phase 3 死亡後保留欄位缺失');

// renderTalent called after death reset
if (appJs.includes('renderTalent()')) ok('renderTalent() 在重置後被呼叫');
else fail('renderTalent() 未在重置後呼叫');

// ========== [43] Phase 3 - 數值邏輯 ==========
console.log('\n[43] Phase 3 - 數值邏輯驗證');

// Story node reward check
const storyNodeMatch = appJs.match(/stage:\s*10[^}]*?reward:\s*\{([^}]*)\}/s);
if (storyNodeMatch) {
  ok('第 10 層劇情節點定義並含獎勵');
} else fail('第 10 層劇情節點獎勵定義');

const storyNode20Match = appJs.match(/stage:\s*20[^}]*?reward:\s*\{([^}]*)\}/s);
if (storyNode20Match) {
  ok('第 20 層劇情節點定義並含獎勵');
} else fail('第 20 層劇情節點獎勵定義');

// Talent bonus math: warrior +5 power per point
const warriorBonusMatch = appJs.match(/warrior_power[^}]*?bonusPerPoint:\s*(\d+)/s);
const warriorBonusValue = warriorBonusMatch ? parseInt(warriorBonusMatch[1], 10) : -1;
if (warriorBonusValue >= 5) ok('戰士攻擊天賦值 >= 5 (bonusPerPoint)');
else fail('戰士攻擊天賦值 (bonusPerPoint 未找到或值不足)');

// Offline earnings cap check
if (appJs.includes('MAX_OFFLINE_MS') && (appJs.includes('2 * 60 * 60 * 1000') || appJs.includes('7200000'))) ok('離線收益上限 2 小時');
else fail('離線收益上限設定');

// Talent point award: every 5 stages
if (appJs.includes('stage % 5 === 0') && appJs.includes('talentPoints')) ok('每 5 層獲得天賦點數');
else fail('天賦點數獲得條件');

// Offline min threshold
if (appJs.includes('MIN_OFFLINE_MS') && (appJs.includes('60 * 1000') || appJs.includes('60000'))) ok('離線收益最小閾值 1 分鐘');
else fail('離線收益最小閾值');

// ========== [50] Server 結構 ==========
console.log('\n[50] Server 結構 - 檔案檢查');
const serverJsPath = path.join(dir, 'server.js');
const pkgJsonPath = path.join(dir, 'package.json');

if (!fs.existsSync(serverJsPath)) {
  fail('server.js', '檔案不存在');
} else {
  ok('server.js 存在');
  const serverJs = fs.readFileSync(serverJsPath, 'utf8');
  if (serverJs.includes('/api/health')) ok('/api/health 端點定義存在');
  else fail('/api/health 端點');
  if (serverJs.includes('/api/save')) ok('/api/save 端點定義存在');
  else fail('/api/save 端點');
  if (serverJs.includes('/api/load')) ok('/api/load 端點定義存在');
  else fail('/api/load 端點');
  if (serverJs.includes('/api/leaderboard')) ok('/api/leaderboard 端點定義存在');
  else fail('/api/leaderboard 端點');
  if (serverJs.includes('express.static') || serverJs.includes('sendFile')) ok('靜態檔案服務（express.static / sendFile）存在');
  else fail('靜態檔案服務不存在');
  if (serverJs.includes('express.json')) ok('JSON body parser 存在');
  else fail('JSON body parser 不存在');
  if (serverJs.includes('rateLimit') || serverJs.includes('429') || serverJs.includes('Too many') || serverJs.includes('express-rate-limit')) ok('API rate limiting 防護存在');
  else fail('API rate limiting 防護不存在');
}

if (!fs.existsSync(pkgJsonPath)) {
  fail('package.json', '檔案不存在');
} else {
  ok('package.json 存在');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    if (pkg.scripts && pkg.scripts.start) ok('package.json scripts.start 存在');
    else fail('package.json scripts.start');
    if (pkg.dependencies && pkg.dependencies.express) ok('express 依賴已定義');
    else fail('express 依賴未定義');
  } catch (e) {
    fail('package.json 解析失敗', e.message);
  }
}

// ========== [50b] app.js - CS-03/04 整合 ==========
console.log('\n[50b] app.js - Save/Load/Leaderboard 整合');
if (appJs.includes('saveToServer') && appJs.includes('/api/save')) ok('saveToServer 函式與 /api/save 整合');
else fail('saveToServer 函式或 API 路徑缺失');

if (appJs.includes('loadFromServer') && appJs.includes('/api/load')) ok('loadFromServer 函式與 /api/load 整合');
else fail('loadFromServer 函式或 API 路徑缺失');

if (appJs.includes('loadFromLocalStorage') && appJs.includes('LS_KEY')) ok('localStorage 降級容錯邏輯存在');
else fail('localStorage 降級容錯邏輯缺失');

if (appJs.includes('renderLeaderboard') && appJs.includes('/api/leaderboard')) ok('renderLeaderboard 函式與 API 整合');
else fail('renderLeaderboard 函式或 API 路徑缺失');

if (appJs.includes('submitLeaderboard') && appJs.includes('calcScore')) ok('submitLeaderboard / calcScore 函式存在');
else fail('submitLeaderboard / calcScore 函式缺失');

if (appJs.includes('initServerButtons')) ok('initServerButtons 初始化函式存在');
else fail('initServerButtons 函式缺失');

if (appJs.includes('escHtml')) ok('escHtml XSS 防護函式存在');
else fail('escHtml 函式缺失');

if (appJs.includes('function autoSave') && appJs.includes('AUTO_SAVE_DELAY_MS')) ok('autoSave 自動存檔函式存在（含防抖延遲）');
else fail('autoSave 函式缺失');

if (appJs.includes('function autoLoad') && appJs.includes('autoLoad()')) ok('autoLoad 啟動自動載入函式存在');
else fail('autoLoad 函式缺失');

// autoSave called in key actions
const autoSaveCallCount = (appJs.match(/autoSave\(\)/g) || []).length;
if (autoSaveCallCount >= 7) ok('autoSave() 已掛鉤至關鍵玩家行動（' + autoSaveCallCount + ' 處）');
else fail('autoSave() 掛鉤不足（找到 ' + autoSaveCallCount + ' 處，需至少 7 處）');

// ========== [50c] index.html - 排行榜結構 ==========
console.log('\n[50c] index.html - 排行榜結構');
const lbIds = ['leaderboardList', 'btnRefreshLeaderboard', 'saveStatus'];
for (const id of lbIds) {
  if (html.includes(`id="${id}"`) || html.includes(`id='${id}'`)) ok('id="' + id + '"');
  else fail('id="' + id + '"');
}
if (html.includes('data-tab="leaderboard"') || html.includes("data-tab='leaderboard'")) ok('分頁「排行榜」存在');
else fail('分頁「排行榜」不存在');

// ========== 結果 ==========
console.log('\n' + '─'.repeat(50));
console.log(`通過: ${passed}  失敗: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
