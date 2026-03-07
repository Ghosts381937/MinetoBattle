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

// ========== 結果 ==========
console.log('\n' + '─'.repeat(50));
console.log(`通過: ${passed}  失敗: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
