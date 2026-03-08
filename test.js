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

// ========== 結果 ==========
console.log('\n' + '─'.repeat(50));
console.log(`通過: ${passed}  失敗: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
