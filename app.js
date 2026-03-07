(function () {
  'use strict';

  const STRONG_ENEMY_CHANCE = 0.15; // 15%
  const AFFIXES = ['鋒利', '堅固', '迅捷', '吸血', '暴擊', '破甲', '火焰', '冰霜'];
  const ELEMENT_NAMES = ['火之精華', '水之精華', '風之精華', '土之精華'];

  const ENEMY_PROFILES = [
    { id: 'slime', name: '史萊姆', type: 'normal', baseHp: 35, baseAtk: 5 },
    { id: 'goblin', name: '哥布林', type: 'assassin', baseHp: 30, baseAtk: 7 },
    { id: 'wolf', name: '狼人', type: 'feral', baseHp: 45, baseAtk: 8 },
    { id: 'skeleton', name: '骷髏兵', type: 'shielded', baseHp: 55, baseAtk: 6 },
    { id: 'shadow', name: '暗影獸', type: 'vampire', baseHp: 50, baseAtk: 9 }
  ];

  const INITIAL_STATE = {
    gold: 100,
    power: 10,
    def: 0,
    critChance: 0.05,
    critMult: 1.5,
    hp: 100,
    hpMax: 100,
    baseStats: {
      power: 10,
      def: 0,
      hpMax: 100,
      critChance: 0.05,
      critMult: 1.5
    },
    materials: {},      // 魔獸殘片 id -> count
    elements: {},       // 進階元素 id -> count
    equipment: [],      // 裝備背包
    equipmentSlots: {   // 當前已裝備物品
      weapon: null,
      armor: null,
      accessory: null
    },
    currentEnemy: null,
    summonStones: 2,    // 初級召喚石，唯一召喚貨幣
    stage: 1,
    stageProgress: 0,
    stageTarget: 3,
    battle: {
      playerStatus: { shield: 0 },
      enemyStatus: { bleedingTurns: 0, stunnedTurns: 0 }
    }
  };

  const state = JSON.parse(JSON.stringify(INITIAL_STATE));

  const storeItems = [
    { id: 'stone', name: '初級召喚石', price: 15, desc: '用於召喚祭壇' },
    { id: 'elixir', name: '療傷藥', price: 20, desc: '恢復 30 生命' },
    { id: 'power_up', name: '戰力藥劑', price: 50, desc: '永久 +2 戰力' }
  ];

  function log(msg, className = '') {
    const el = document.getElementById('gameLog');
    if (!el) return;
    const line = document.createElement('div');
    line.className = className;
    line.textContent = `[${new Date().toLocaleTimeString('zh-TW', { hour12: false })}] ${msg}`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  function panelLog(panelId, msg, className = '') {
    const el = document.getElementById(panelId);
    if (!el) return;
    const line = document.createElement('div');
    line.className = 'entry ' + className;
    line.textContent = msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  function updateStats() {
    const g = document.getElementById('gold');
    const p = document.getElementById('power');
    const h = document.getElementById('hp');
    const m = document.getElementById('hpMax');
    if (g) g.textContent = state.gold;
    if (p) g && (p.textContent = state.power);
    if (p) p.textContent = state.power;
    if (h) h.textContent = state.hp;
    if (m) m.textContent = state.hpMax;
    const s = document.getElementById('stones');
    if (s) s.textContent = state.summonStones ?? 0;
    const d = document.getElementById('def');
    if (d) d.textContent = state.def ?? 0;
    const st = document.getElementById('stage');
    if (st) st.textContent = state.stage ?? 1;
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getStageConfig(stage) {
    const s = Math.max(1, stage || 1);
    const target = 3 + Math.floor((s - 1) / 3);
    const enemyHpMultiplier = 1 + (s - 1) * 0.15;
    const enemyAtkMultiplier = 1 + (s - 1) * 0.12;
    const strongChance = Math.min(STRONG_ENEMY_CHANCE + (s - 1) * 0.03, 0.4);
    return { target, enemyHpMultiplier, enemyAtkMultiplier, strongChance };
  }

  function syncStageTarget() {
    const cfg = getStageConfig(state.stage);
    state.stageTarget = cfg.target;
  }

  function recalcStatsFromBaseAndEquipment() {
    if (!state.baseStats) return;
    const base = state.baseStats;
    state.power = base.power;
    state.def = base.def;
    state.hpMax = base.hpMax;
    state.critChance = base.critChance;
    state.critMult = base.critMult;

    Object.values(state.equipmentSlots || {}).forEach(eq => {
      if (!eq || !eq.stats) return;
      if (typeof eq.stats.power === 'number') state.power += eq.stats.power;
      if (typeof eq.stats.def === 'number') state.def += eq.stats.def;
      if (typeof eq.stats.hpMax === 'number') state.hpMax += eq.stats.hpMax;
      if (typeof eq.stats.critChance === 'number') state.critChance += eq.stats.critChance;
      if (typeof eq.stats.critMult === 'number') state.critMult += eq.stats.critMult;
    });

    if (state.hp > state.hpMax) {
      state.hp = state.hpMax;
    }
  }

  function resetBattleState() {
    state.battle = {
      playerStatus: { shield: 0 },
      enemyStatus: { bleedingTurns: 0, stunnedTurns: 0 }
    };
  }

  function resetPlayerToInitial() {
    const fresh = JSON.parse(JSON.stringify(INITIAL_STATE));
    Object.keys(fresh).forEach(key => {
      state[key] = fresh[key];
    });
    resetBattleState();
    syncStageTarget();
    recalcStatsFromBaseAndEquipment();
    updateStats();
    renderStore();
    renderBattle();
    renderExchange();
    renderInventory();
  }

  function computePlayerDamage(multiplier = 1) {
    let base = state.power + rand(0, 2);
    let dmg = Math.max(1, Math.round(base * multiplier));
    let isCrit = false;
    const chance = state.critChance ?? 0;
    if (Math.random() < chance) {
      dmg = Math.round(dmg * (state.critMult || 1.5));
      isCrit = true;
    }
    return { dmg, isCrit };
  }

  function computeEnemyDamage(enemy) {
    let base = enemy.atk + rand(-1, 1);
    if (base < 1) base = 1;
    let taken = base;

    const playerStatus = state.battle.playerStatus;
    if (playerStatus.shield > 0) {
      const blocked = Math.min(taken, playerStatus.shield);
      taken -= blocked;
      playerStatus.shield -= blocked;
      if (blocked > 0) {
        panelLog('battleLog', `你的護盾擋下 ${blocked} 點傷害。`);
      }
    }

    taken = Math.max(1, taken - (state.def || 0));
    return taken;
  }

  function advanceStageProgress() {
    state.stageProgress = (state.stageProgress || 0) + 1;
    const cfg = getStageConfig(state.stage);
    state.stageTarget = cfg.target;
    if (state.stageProgress >= state.stageTarget) {
      const clearedStage = state.stage;
      const rewardGold = 20 + clearedStage * 5;
      const elem = pick(ELEMENT_NAMES);
      state.gold += rewardGold;
      state.elements[elem] = (state.elements[elem] || 0) + 1;
      state.stage += 1;
      syncStageTarget();
      state.stageProgress = 0;
      panelLog('battleLog', `你通過了第 ${clearedStage} 層遺跡！`, 'loot-up');
      log(`通關獎勵：💰 ${rewardGold} 與 ${elem} x1`, 'loot-up');
    }
    updateStats();
  }

  // ----- 商店 -----
  function renderStore() {
    const list = document.getElementById('storeList');
    if (!list) return;
    list.innerHTML = storeItems.map(item => {
      const canBuy = state.gold >= item.price;
      return `
        <div class="item-card">
          <span class="name">${item.name}</span>
          <span class="desc">${item.desc}</span>
          <span class="price">💰 ${item.price}</span>
          <button ${!canBuy ? 'disabled' : ''} data-id="${item.id}" data-price="${item.price}">購買</button>
        </div>`;
    }).join('');
    list.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => buyItem(btn.dataset.id, parseInt(btn.dataset.price, 10)));
    });
  }

  function buyItem(id, price) {
    if (state.gold < price) return;
    state.gold -= price;
    if (id === 'stone') {
      state.summonStones = (state.summonStones || 0) + 1;
      log('購買了 初級召喚石', 'loot-up');
    } else if (id === 'elixir') {
      state.hp = Math.min(state.hpMax, state.hp + 30);
      log('使用療傷藥，恢復 30 生命', 'loot-up');
    } else if (id === 'power_up') {
      state.baseStats.power += 2;
      recalcStatsFromBaseAndEquipment();
      log('使用戰力藥劑，戰力 +2', 'loot-up');
    }
    updateStats();
    renderStore();
  }

  // ----- 召喚祭壇 -----
  function createEnemy(strong) {
    const stage = state.stage || 1;
    const profile = pick(ENEMY_PROFILES);
    const cfg = getStageConfig(stage);
    const level = stage;
    const baseHp = profile.baseHp * cfg.enemyHpMultiplier;
    const baseAtk = profile.baseAtk * cfg.enemyAtkMultiplier;
    const hp = strong ? Math.floor(baseHp * 1.5) : Math.floor(baseHp);
    const atk = strong ? Math.round(baseAtk + 3) : Math.round(baseAtk);
    const def = strong ? 1 + Math.floor(stage / 2) : Math.floor(stage / 3);
    const namePrefix = strong ? '【強敵】' : '';
    const name = `${namePrefix}${profile.name} Lv.${level}`;
    return {
      id: profile.id,
      type: profile.type,
      name,
      hp,
      hpMax: hp,
      atk,
      def,
      level,
      strong,
      affix: strong ? pick(AFFIXES) : null
    };
  }

  function doSummon() {
    const logEl = document.getElementById('altarLog');
    if (logEl) logEl.innerHTML = '';

    if (!state.summonStones || state.summonStones < 1) {
      panelLog('altarLog', '召喚石不足，請到商店購買。');
      return;
    }
    state.summonStones -= 1;
    const cfg = getStageConfig(state.stage);
    const strong = Math.random() < cfg.strongChance;
    state.currentEnemy = createEnemy(strong);
    resetBattleState();

    panelLog('altarLog', strong ? '⚠️ 遭遇強敵！屬性與掉寶提升。' : `進行了普通召喚。（第 ${state.stage} 層）`);
    panelLog('altarLog', `出現：${state.currentEnemy.name}（HP ${state.currentEnemy.hp} / ATK ${state.currentEnemy.atk}）${state.currentEnemy.affix ? ' 詞綴：' + state.currentEnemy.affix : ''}`, strong ? 'strong-enemy' : '');

    updateStats();
    renderBattle();
    document.querySelector('.tab[data-tab="battle"]').click();
  }

  // ----- 戰鬥 -----
  function renderBattle() {
    const empty = document.getElementById('battleEmpty');
    const active = document.getElementById('battleActive');
    if (!state.currentEnemy) {
      if (empty) empty.classList.remove('hidden');
      if (active) active.classList.add('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    if (active) active.classList.remove('hidden');

    const e = state.currentEnemy;
    document.getElementById('enemyName').textContent = e.name;
    document.getElementById('enemyStats').textContent = `HP ${e.hp}/${e.hpMax} · ATK ${e.atk}${e.affix ? ' · 詞綴：' + e.affix : ''}`;
    document.getElementById('enemyHpFill').style.width = (e.hp / e.hpMax * 100) + '%';

    const blog = document.getElementById('battleLog');
    if (blog) blog.innerHTML = '';
  }

  function giveDrops(strong) {
    const matCount = rand(1, strong ? 3 : 2);
    const matId = 'mat_' + rand(1, 4);
    state.materials[matId] = (state.materials[matId] || 0) + matCount;
    log(`獲得魔獸殘片 x${matCount}`);

    if (strong) {
      const elem = pick(ELEMENT_NAMES);
      state.elements[elem] = (state.elements[elem] || 0) + 1;
      log(`獲得進階元素：${elem}`, 'loot-up');
    }

    const equipRoll = strong ? 0.6 : 0.3;
    if (Math.random() < equipRoll) {
      const affix = pick(AFFIXES);
      const eqPower = rand(1, strong ? 5 : 3);
      const slot = pick(['weapon', 'armor', 'accessory']);
      const stats = {};
      if (slot === 'weapon') {
        stats.power = eqPower;
      } else if (slot === 'armor') {
        stats.def = Math.max(1, Math.floor(eqPower / 2));
        stats.hpMax = eqPower * 5;
      } else {
        stats.critChance = 0.02 * eqPower;
      }
      const equipment = {
        id: Date.now() + '_' + Math.floor(Math.random() * 100000),
        slot,
        name: '掉落裝備',
        affix,
        power: eqPower,
        stats,
        equipped: false
      };
      state.equipment.push(equipment);
      log(`獲得裝備【${affix}】（${slot}）`, 'loot-up');
    }

    advanceStageProgress();
  }

  function performPlayerAction(action) {
    if (!state.currentEnemy) return;
    const enemy = state.currentEnemy;
    const playerStatus = state.battle.playerStatus;
    const enemyStatus = state.battle.enemyStatus;

    if (action === 'attack') {
      const { dmg, isCrit } = computePlayerDamage(1);
      enemy.hp -= dmg;
      panelLog('battleLog', `你使用普攻造成 ${dmg} 點傷害。${isCrit ? '（暴擊！）' : ''}`);
    } else if (action === 'heavy') {
      const { dmg, isCrit } = computePlayerDamage(1.7);
      enemy.hp -= dmg;
      const selfCost = 5;
      state.hp = Math.max(1, state.hp - selfCost);
      panelLog('battleLog', `你使用重擊造成 ${dmg} 點傷害，自己承受 ${selfCost} 點反作用力。${isCrit ? '（暴擊！）' : ''}`);
      if (Math.random() < 0.2) {
        enemyStatus.stunnedTurns = 1;
        panelLog('battleLog', '敵人被暈眩一回合！');
      }
      if (Math.random() < 0.5) {
        enemyStatus.bleedingTurns = 2;
        panelLog('battleLog', '敵人陷入流血狀態。');
      }
    } else if (action === 'defend') {
      const shieldGain = 5 + (state.def || 0);
      playerStatus.shield += shieldGain;
      panelLog('battleLog', `你採取防禦姿態，獲得 ${shieldGain} 點護盾。`);
    } else if (action === 'heal') {
      const heal = 20;
      const before = state.hp;
      state.hp = Math.min(state.hpMax, state.hp + heal);
      const gained = state.hp - before;
      panelLog('battleLog', `你使用治療，恢復 ${gained} 點生命。`);
    }

    if (enemy.hp > 0 && enemyStatus.bleedingTurns > 0) {
      const bleedDmg = 2;
      enemy.hp -= bleedDmg;
      enemyStatus.bleedingTurns -= 1;
      panelLog('battleLog', `敵人因流血受到 ${bleedDmg} 點傷害。`);
    }

    if (enemy.hp <= 0) {
      panelLog('battleLog', `${enemy.name} 被擊敗！`, 'loot-up');
      giveDrops(enemy.strong);
      state.currentEnemy = null;
      renderBattle();
      renderExchange();
      renderInventory();
      return;
    }

    if (enemyStatus.stunnedTurns > 0) {
      enemyStatus.stunnedTurns -= 1;
      panelLog('battleLog', '敵人暈眩中，無法行動。');
    } else {
      const taken = computeEnemyDamage(enemy);
      state.hp = Math.max(0, state.hp - taken);
      panelLog('battleLog', `對方反擊，你受到 ${taken} 點傷害。`);
    }

    updateStats();
    renderBattle();

    if (state.hp <= 0) {
      panelLog('battleLog', '你已倒下，玩家狀態已重置至初始並重新開始。');
      log('你倒下了，所有玩家狀態已回到初始值。');
      resetPlayerToInitial();
    }
  }

  function doAttack() {
    performPlayerAction('attack');
  }

  // ----- 交易所 -----
  function sellPrice(item) {
    if (item.type === 'material') return 5;
    if (item.type === 'element') return 15;
    if (item.type === 'equipment') return 10 + (item.power || 0) * 3;
    return 5;
  }

  function renderExchange() {
    const list = document.getElementById('exchangeList');
    if (!list) return;
    const nodes = [];

    Object.entries(state.materials).forEach(([id, qty]) => {
      if (qty <= 0) return;
      const price = 5;
      nodes.push(`
        <div class="item-card">
          <span class="name">魔獸殘片 ${id.replace('mat_', '#')}</span>
          <span class="desc">數量：${qty}</span>
          <span class="price">賣出可得 💰 ${price * qty}</span>
          <button data-type="material" data-id="${id}" data-qty="${qty}" data-price="${price}">全部賣出</button>
        </div>`);
    });
    Object.entries(state.elements).forEach(([name, qty]) => {
      if (qty <= 0) return;
      const price = 15;
      nodes.push(`
        <div class="item-card">
          <span class="name">${name}</span>
          <span class="desc">數量：${qty}</span>
          <span class="price">賣出可得 💰 ${price * qty}</span>
          <button data-type="element" data-id="${name}" data-qty="${qty}" data-price="${price}">全部賣出</button>
        </div>`);
    });
    state.equipment.forEach((eq, i) => {
      const price = 10 + (eq.power || 0) * 3;
      nodes.push(`
        <div class="item-card">
          <span class="name">${eq.name}【${eq.affix}】</span>
          <span class="desc">戰力+${eq.power}${eq.equipped ? ' · 已裝備' : ''}</span>
          <span class="price">賣出可得 💰 ${price}</span>
          <button data-type="equipment" data-index="${i}" data-price="${price}" ${eq.equipped ? 'disabled' : ''}>賣出</button>
        </div>`);
    });

    list.innerHTML = nodes.length ? nodes.join('') : '<p class="hint">暫無可出售物品。擊敗怪物可獲得魔獸殘片（副產物）與裝備。</p>';
    list.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const price = parseInt(btn.dataset.price, 10);
        if (type === 'material') {
          const id = btn.dataset.id;
          const qty = parseInt(btn.dataset.qty, 10);
          state.gold += price * qty;
          state.materials[id] = 0;
          panelLog('exchangeLog', `賣出魔獸殘片，獲得 💰 ${price * qty}`);
        } else if (type === 'element') {
          const id = btn.dataset.id;
          const qty = parseInt(btn.dataset.qty, 10);
          state.gold += price * qty;
          state.elements[id] = 0;
          panelLog('exchangeLog', `賣出 ${id} x${qty}，獲得 💰 ${price * qty}`);
        } else if (type === 'equipment') {
          const i = parseInt(btn.dataset.index, 10);
          const eq = state.equipment[i];
          if (!eq) return;
          if (eq.equipped) {
            panelLog('exchangeLog', '已裝備中的裝備無法直接賣出，請先在背包卸下。');
            return;
          }
          state.gold += price;
          const removed = state.equipment.splice(i, 1)[0];
          panelLog('exchangeLog', `賣出裝備【${removed.affix}】，獲得 💰 ${price}`);
          recalcStatsFromBaseAndEquipment();
        }
        updateStats();
        renderStore();
        renderExchange();
        renderInventory();
      });
    });
  }

  // ----- 背包 -----
  function renderInventory() {
    const mats = document.getElementById('invMaterials');
    const elems = document.getElementById('invElements');
    const equips = document.getElementById('invEquipment');
    if (mats) {
      const entries = Object.entries(state.materials).filter(([, q]) => q > 0);
      mats.innerHTML = entries.length
        ? entries.map(([id, q]) => `<span class="tag">殘片${id.replace('mat_', '#')} <span class="qty">×${q}</span></span>`).join('')
        : '<span class="text-dim">無</span>';
    }
    if (elems) {
      const entries = Object.entries(state.elements).filter(([, q]) => q > 0);
      elems.innerHTML = entries.length
        ? entries.map(([name, q]) => `<span class="tag">${name} <span class="qty">×${q}</span></span>`).join('')
        : '<span class="text-dim">無</span>';
    }
    if (equips) {
      if (!state.equipment.length) {
        equips.innerHTML = '<span class="text-dim">無</span>';
        return;
      }
      const slots = state.equipmentSlots || {};
      const slotLabel = { weapon: '武器', armor: '防具', accessory: '飾品' };
      const equippedSection = `
        <div class="equipped-summary">
          <div>武器：${slots.weapon ? `${slots.weapon.name}【${slots.weapon.affix}】` : '<span class="text-dim">未裝備</span>'}</div>
          <div>防具：${slots.armor ? `${slots.armor.name}【${slots.armor.affix}】` : '<span class="text-dim">未裝備</span>'}</div>
          <div>飾品：${slots.accessory ? `${slots.accessory.name}【${slots.accessory.affix}】` : '<span class="text-dim">未裝備</span>'}</div>
        </div>`;
      const list = state.equipment.map((eq, i) => {
        const isEquipped = !!eq.equipped;
        const slotName = slotLabel[eq.slot] || '裝備';
        const btnLabel = isEquipped ? '已裝備' : '裝備';
        const disabled = isEquipped ? 'disabled' : '';
        return `
          <div class="equip-row">
            <span class="tag">${slotName} ${eq.name}【${eq.affix}】+${eq.power}</span>
            <button class="equip-btn" data-index="${i}" ${disabled}>${btnLabel}</button>
          </div>`;
      }).join('');
      equips.innerHTML = equippedSection + list;
      equips.querySelectorAll('.equip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index, 10);
          equipItem(index);
        });
      });
    }
  }

  function equipItem(index) {
    const eq = state.equipment[index];
    if (!eq) return;
    const slot = eq.slot || 'weapon';
    if (!state.equipmentSlots) {
      state.equipmentSlots = { weapon: null, armor: null, accessory: null };
    }
    state.equipment.forEach(item => {
      if (item.slot === slot) {
        item.equipped = false;
      }
    });
    eq.equipped = true;
    state.equipmentSlots[slot] = eq;
    recalcStatsFromBaseAndEquipment();
    updateStats();
    renderInventory();
  }


  // ----- 分頁 -----
  function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const id = tab.dataset.tab;
        const panel = document.getElementById(id);
        if (panel) panel.classList.add('active');
      });
    });
  }

  document.getElementById('btnSummon').addEventListener('click', doSummon);
  document.getElementById('btnAttack').addEventListener('click', function () {
    performPlayerAction('attack');
  });
  document.getElementById('btnHeavy').addEventListener('click', function () {
    performPlayerAction('heavy');
  });
  document.getElementById('btnDefend').addEventListener('click', function () {
    performPlayerAction('defend');
  });
  const healBtn = document.getElementById('btnHeal');
  if (healBtn) {
    healBtn.addEventListener('click', function () {
      performPlayerAction('heal');
    });
  }

  initTabs();
  syncStageTarget();
  recalcStatsFromBaseAndEquipment();
  updateStats();
  renderStore();
  renderBattle();
  renderExchange();
  renderInventory();
})();
