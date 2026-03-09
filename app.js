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

  // ----- Phase 2 constants -----
  const ENEMY_TYPE_LABELS = {
    normal: '普通', assassin: '刺客', feral: '野性', shielded: '護盾', vampire: '吸血'
  };

  const DAILY_QUESTS = [
    { id: 'q_kill3',    desc: '擊敗 3 隻怪物',        type: 'kills',       target: 3,  reward: { gold: 30 } },
    { id: 'q_kill10',   desc: '擊敗 10 隻怪物',       type: 'kills',       target: 10, reward: { gold: 80, gems: 1 } },
    { id: 'q_strong3',  desc: '擊敗 3 隻強敵',        type: 'strongKills', target: 3,  reward: { gold: 50, gems: 1 } },
    { id: 'q_stage3',   desc: '抵達第 3 層',           type: 'stage',       target: 3,  reward: { gems: 2 } },
    { id: 'q_buy3',     desc: '在商店購買 3 件商品',   type: 'purchases',   target: 3,  reward: { gold: 25 } }
  ];

  const ACHIEVEMENTS = [
    { id: 'ach_kill10',   desc: '擊敗 10 隻怪物',        type: 'kills',       target: 10, reward: { gold: 50 } },
    { id: 'ach_kill50',   desc: '擊敗 50 隻怪物',        type: 'kills',       target: 50, reward: { gems: 5, gold: 100 } },
    { id: 'ach_stage5',   desc: '抵達第 5 層',            type: 'stage',       target: 5,  reward: { gems: 3 } },
    { id: 'ach_stage10',  desc: '抵達第 10 層',           type: 'stage',       target: 10, reward: { gems: 8 } },
    { id: 'ach_encounter', desc: '遭遇所有怪物種類',    type: 'encountered', target: 5,  reward: { gems: 5 } }
  ];

  const SPECIAL_STORE_POOL = [
    { id: 'elite_stone',   name: '精英召喚石',   price: 3, currency: 'gems', desc: '精英召喚：強敵率 +35%，掉寶提升' },
    { id: 'element_stone', name: '元素召喚石',   price: 4, currency: 'gems', desc: '元素召喚：必獲得進階元素' },
    { id: 'hp_up',         name: '生命強化藥劑', price: 60, currency: 'gold', desc: '永久 +20 最大生命' },
    { id: 'def_up',        name: '防禦強化藥劑', price: 60, currency: 'gold', desc: '永久 +1 防禦' },
    { id: 'crit_up',       name: '暴擊強化藥劑', price: 80, currency: 'gold', desc: '永久 +3% 暴擊率' }
  ];
  const SPECIAL_STORE_SLOT_COUNT = 3;

  // ----- Phase 3 constants -----
  const FLOAT_DURATION_MS = 800;      // must match CSS animation duration in floatUp
  const MAX_OFFLINE_MS   = 2 * 60 * 60 * 1000; // 2-hour offline earnings cap
  const MIN_OFFLINE_MS   = 60 * 1000;           // minimum 1 minute before offline rewards trigger

  const STORY_NODES = [
    {
      stage: 10,
      title: '迷霧深處的呼喚',
      text: '你踏入第 10 層，古老符文忽然亮起，低沉聲音傳來：\n「冒險者，你已通過試煉的第一關——繼續深入，真相正等著你揭開。」',
      reward: { gold: 100, gems: 3 }
    },
    {
      stage: 20,
      title: '深淵之王的陰影',
      text: '第 20 層的門扉轟然敞開，碑石上刻著血紅文字：\n「勇者，你已接近我的領域——此處的黑暗遠比你所見過的一切更為可怕。願你的意志堅如磐石……」',
      reward: { gold: 200, gems: 8 }
    }
  ];

  const TALENT_SPECS = {
    warrior: {
      name: '戰士', icon: '🗡️',
      desc: '以力量壓倒敵人，擅長正面戰鬥',
      talents: [
        { id: 'warrior_power', name: '蠻力強化', desc: '攻擊力 +5',      maxLevel: 1, bonusType: 'power',      bonusPerPoint: 5    },
        { id: 'warrior_hp',    name: '鐵壁之軀', desc: '最大生命值 +30', maxLevel: 1, bonusType: 'hpMax',      bonusPerPoint: 30   }
      ]
    },
    assassin: {
      name: '刺客', icon: '🗡',
      desc: '以敏捷和精準出其不意',
      talents: [
        { id: 'assassin_crit',  name: '致命一擊', desc: '暴擊率 +8%',      maxLevel: 1, bonusType: 'critChance',  bonusPerPoint: 0.08 },
        { id: 'assassin_bleed', name: '毒刃',     desc: '重擊流血機率 +20%', maxLevel: 1, bonusType: 'bleedChance', bonusPerPoint: 0.20 }
      ]
    },
    mage: {
      name: '法師', icon: '✨',
      desc: '召喚元素力量，強化爆發傷害',
      talents: [
        { id: 'mage_critMult',  name: '元素共鳴', desc: '暴擊傷害倍率 +0.3',          maxLevel: 1, bonusType: 'critMult',  bonusPerPoint: 0.3  },
        { id: 'mage_elemBonus', name: '元素掌控', desc: '擊殺時額外元素掉落機率 +20%', maxLevel: 1, bonusType: 'elemBonus', bonusPerPoint: 0.20 }
      ]
    }
  };

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
    },
    // Phase 2 additions
    gems: 0,           // 稀有貨幣 靈晶
    eliteStones: 0,    // 精英召喚石
    elementStones: 0,  // 元素召喚石
    stats: { totalKills: 0, strongKills: 0, totalPurchases: 0 },
    questClaimed: {},  // questId -> true
    achClaimed: {},    // achId -> true
    encountered: {},   // enemyId -> true
    collectedAffixes: {}, // affix -> count
    shopRefreshIndex: 0,
    // Phase 3 additions
    seenTips: {},
    logFilter: 'all',
    storylineClaimed: {},
    talentPoints: 0,
    talentSpec: null,
    talentAlloc: {},
    lastSaveTime: 0
  };

  const state = JSON.parse(JSON.stringify(INITIAL_STATE));

  const storeItems = [
    { id: 'stone', name: '初級召喚石', price: 15, desc: '用於召喚祭壇' },
    { id: 'elixir', name: '療傷藥', price: 20, desc: '恢復 30 生命' },
    { id: 'power_up', name: '戰力藥劑', price: 50, desc: '永久 +2 戰力' }
  ];

  const LOG_ENTRIES = [];

  function log(msg, className = '', cat = 'system') {
    LOG_ENTRIES.push({ msg, className, cat, time: new Date() });
    renderGameLog();
  }

  function renderGameLog() {
    const el = document.getElementById('gameLog');
    if (!el) return;
    const filter = (state && state.logFilter) || 'all';
    el.innerHTML = '';
    const entries = filter === 'all' ? LOG_ENTRIES : LOG_ENTRIES.filter(e => e.cat === filter);
    entries.slice(-50).forEach(({ msg, className, time }) => {
      const line = document.createElement('div');
      if (className) line.className = className;
      line.textContent = `[${time.toLocaleTimeString('zh-TW', { hour12: false })}] ${msg}`;
      el.appendChild(line);
    });
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

  // ----- Phase 3 helper functions -----
  function getTalentBonus(type) {
    const alloc = state.talentAlloc || {};
    const spec = state.talentSpec;
    if (!spec) return 0;
    for (const t of TALENT_SPECS[spec].talents) {
      if (t.bonusType === type) return (alloc[t.id] || 0) * t.bonusPerPoint;
    }
    return 0;
  }

  function showPanelTip(tabId) {
    const tipId = 'tip' + tabId.charAt(0).toUpperCase() + tabId.slice(1);
    if ((state.seenTips || {})[tipId]) return;
    const el = document.getElementById(tipId);
    if (!el) return;
    state.seenTips = state.seenTips || {};
    state.seenTips[tipId] = true;
    el.classList.remove('hidden');
  }

  function spawnFloat(text, colorClass) {
    const el = document.getElementById('floatLayer');
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'dmg-float' + (colorClass ? ' ' + colorClass : '');
    div.textContent = text;
    el.appendChild(div);
    setTimeout(function () {
      if (div.parentNode) div.parentNode.removeChild(div);
    }, FLOAT_DURATION_MS);
  }

  function showStoryModal(node) {
    if (!node) return;
    const modal = document.getElementById('storyModal');
    if (!modal) return;
    const titleEl  = document.getElementById('storyTitle');
    const textEl   = document.getElementById('storyText');
    const rewardEl = document.getElementById('storyReward');
    if (titleEl)  titleEl.textContent  = node.title;
    if (textEl)   textEl.textContent   = node.text;
    const rewardStr = Object.entries(node.reward)
      .map(([k, v]) => k === 'gems' ? `💎${v}` : `💰${v}`).join(' ');
    if (rewardEl) rewardEl.textContent = '特殊獎勵：' + rewardStr;
    modal.classList.remove('hidden');
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
    const sp = document.getElementById('stageProgress');
    if (sp) sp.textContent = state.stageProgress ?? 0;
    const stg = document.getElementById('stageTarget');
    if (stg) stg.textContent = state.stageTarget ?? 3;
    const ge = document.getElementById('gems');
    if (ge) ge.textContent = state.gems ?? 0;
    const es = document.getElementById('eliteStones');
    if (es) es.textContent = state.eliteStones ?? 0;
    const ems = document.getElementById('elementStones');
    if (ems) ems.textContent = state.elementStones ?? 0;
    const tp = document.getElementById('talentPoints');
    if (tp) tp.textContent = state.talentPoints ?? 0;
    state.lastSaveTime = Date.now();
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
    // Apply talent bonuses to power and hpMax
    state.power += getTalentBonus('power');
    state.hpMax += getTalentBonus('hpMax');
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
    // Submit leaderboard score and snapshot the death state before resetting
    submitLeaderboard(getPlayerDisplayName());
    saveToServer(null);

    // Preserve quest/achievement/catalogue progress and gems across death
    const preservedStats = JSON.parse(JSON.stringify(state.stats || {}));
    const preservedQuestClaimed = JSON.parse(JSON.stringify(state.questClaimed || {}));
    const preservedAchClaimed = JSON.parse(JSON.stringify(state.achClaimed || {}));
    const preservedEncountered = JSON.parse(JSON.stringify(state.encountered || {}));
    const preservedCollectedAffixes = JSON.parse(JSON.stringify(state.collectedAffixes || {}));
    const preservedGems = state.gems || 0;
    // Phase 3 preserved fields
    const preservedSeenTips = JSON.parse(JSON.stringify(state.seenTips || {}));
    const preservedStorylineClaimed = JSON.parse(JSON.stringify(state.storylineClaimed || {}));
    const preservedTalentPoints = state.talentPoints || 0;
    const preservedTalentSpec = state.talentSpec || null;
    const preservedTalentAlloc = JSON.parse(JSON.stringify(state.talentAlloc || {}));

    const fresh = JSON.parse(JSON.stringify(INITIAL_STATE));
    Object.keys(fresh).forEach(key => {
      state[key] = fresh[key];
    });

    state.stats = preservedStats;
    state.questClaimed = preservedQuestClaimed;
    state.achClaimed = preservedAchClaimed;
    state.encountered = preservedEncountered;
    state.collectedAffixes = preservedCollectedAffixes;
    state.gems = preservedGems;
    // Phase 3 restore
    state.seenTips = preservedSeenTips;
    state.storylineClaimed = preservedStorylineClaimed;
    state.talentPoints = preservedTalentPoints;
    state.talentSpec = preservedTalentSpec;
    state.talentAlloc = preservedTalentAlloc;

    resetBattleState();
    syncStageTarget();
    recalcStatsFromBaseAndEquipment();
    updateStats();
    renderStore();
    renderSpecialStore();
    renderBattle();
    renderExchange();
    renderInventory();
    renderQuests();
    renderAchievements();
    renderCatalogue();
    renderTalent();
    autoSave();
  }

  function computePlayerDamage(multiplier = 1) {
    let base = state.power + rand(0, 2);
    let dmg = Math.max(1, Math.round(base * multiplier));
    let isCrit = false;
    const chance = (state.critChance ?? 0) + getTalentBonus('critChance');
    if (Math.random() < chance) {
      dmg = Math.round(dmg * ((state.critMult || 1.5) + getTalentBonus('critMult')));
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
      if (!state.stats) state.stats = {};
      state.stats.maxStage = Math.max(state.stats.maxStage || 1, state.stage);
      syncStageTarget();
      state.stageProgress = 0;
      panelLog('battleLog', `你通過了第 ${clearedStage} 層遺跡！`, 'loot-up');
      log(`通關獎勵：💰 ${rewardGold} 與 ${elem} x1`, 'loot-up', 'loot');
      renderQuests();
      renderAchievements();
      // Phase 3: award talent point every 5 stages
      if (state.stage % 5 === 0) {
        state.talentPoints = (state.talentPoints || 0) + 1;
        log(`🌟 天賦點數 +1（目前 ${state.talentPoints} 點）`, '', 'system');
        renderTalent();
      }
      // Phase 3: check story nodes
      const storyNode = STORY_NODES.find(
        n => n.stage === state.stage && !(state.storylineClaimed || {})[n.stage]
      );
      if (storyNode) {
        state.storylineClaimed = state.storylineClaimed || {};
        state.storylineClaimed[storyNode.stage] = true;
        state.gold += storyNode.reward.gold || 0;
        state.gems = (state.gems || 0) + (storyNode.reward.gems || 0);
        const rewardStr = Object.entries(storyNode.reward)
          .map(([k, v]) => k === 'gems' ? `💎${v}` : `💰${v}`).join(' ');
        log(`📖 劇情解鎖：${storyNode.title}（${rewardStr}）`, 'loot-up', 'system');
        showStoryModal(storyNode);
      }
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

  function buyItem(id, price, currency) {
    const cur = currency || 'gold';
    const balance = cur === 'gems' ? (state.gems || 0) : state.gold;
    if (balance < price) return;
    if (cur === 'gems') {
      state.gems -= price;
    } else {
      state.gold -= price;
    }
    if (id === 'stone') {
      state.summonStones = (state.summonStones || 0) + 1;
      log('購買了 初級召喚石', 'loot-up', 'system');
    } else if (id === 'elixir') {
      state.hp = Math.min(state.hpMax, state.hp + 30);
      log('使用療傷藥，恢復 30 生命', 'loot-up', 'system');
    } else if (id === 'power_up') {
      state.baseStats.power += 2;
      recalcStatsFromBaseAndEquipment();
      log('使用戰力藥劑，戰力 +2', 'loot-up', 'system');
    } else if (id === 'elite_stone') {
      state.eliteStones = (state.eliteStones || 0) + 1;
      log('購買了 精英召喚石', 'loot-up', 'system');
    } else if (id === 'element_stone') {
      state.elementStones = (state.elementStones || 0) + 1;
      log('購買了 元素召喚石', 'loot-up', 'system');
    } else if (id === 'hp_up') {
      state.baseStats.hpMax += 20;
      recalcStatsFromBaseAndEquipment();
      log('使用生命強化藥劑，最大生命 +20', 'loot-up', 'system');
    } else if (id === 'def_up') {
      state.baseStats.def += 1;
      recalcStatsFromBaseAndEquipment();
      log('使用防禦強化藥劑，防禦 +1', 'loot-up', 'system');
    } else if (id === 'crit_up') {
      state.baseStats.critChance += 0.03;
      recalcStatsFromBaseAndEquipment();
      log('使用暴擊強化藥劑，暴擊率 +3%', 'loot-up', 'system');
    }
    state.stats = state.stats || {};
    state.stats.totalPurchases = (state.stats.totalPurchases || 0) + 1;
    updateStats();
    renderStore();
    renderSpecialStore();
    renderQuests();
    autoSave();
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

  function doSummon(type) {
    if (typeof type !== 'string') type = 'normal';
    const logEl = document.getElementById('altarLog');
    if (logEl) logEl.innerHTML = '';

    let stoneProp, stoneLabel, strongBonus;
    if (type === 'elite') {
      stoneProp = 'eliteStones';
      stoneLabel = '精英召喚石';
      strongBonus = 0.35;
    } else if (type === 'element') {
      stoneProp = 'elementStones';
      stoneLabel = '元素召喚石';
      strongBonus = 0;
    } else {
      stoneProp = 'summonStones';
      stoneLabel = '初級召喚石';
      strongBonus = 0;
    }

    if (!state[stoneProp] || state[stoneProp] < 1) {
      panelLog('altarLog', `${stoneLabel}不足，請到商店購買。`);
      return;
    }
    state[stoneProp] -= 1;
    const cfg = getStageConfig(state.stage);
    const strongChance = Math.min(cfg.strongChance + strongBonus, 0.85);
    const strong = Math.random() < strongChance;
    state.currentEnemy = createEnemy(strong);
    state.currentEnemy.summonType = type;
    resetBattleState();

    const typeLabel = type === 'elite' ? '精英召喚' : type === 'element' ? '元素召喚' : '普通召喚';
    panelLog('altarLog', strong ? `⚠️ 【${typeLabel}】遭遇強敵！屬性與掉寶提升。` : `【${typeLabel}】第 ${state.stage} 層`);
    panelLog('altarLog', `出現：${state.currentEnemy.name}（HP ${state.currentEnemy.hp} / ATK ${state.currentEnemy.atk}）${state.currentEnemy.affix ? ' 詞綴：' + state.currentEnemy.affix : ''}`, strong ? 'strong-enemy' : '');

    updateStats();
    renderBattle();
    document.querySelector('.tab[data-tab="battle"]').click();
    autoSave();
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
    const summonType = (state.currentEnemy && state.currentEnemy.summonType) || 'normal';

    // Track encounter and kill stats
    if (state.currentEnemy) {
      state.encountered = state.encountered || {};
      state.encountered[state.currentEnemy.id] = true;
    }
    state.stats = state.stats || {};
    state.stats.totalKills = (state.stats.totalKills || 0) + 1;
    if (strong) state.stats.strongKills = (state.stats.strongKills || 0) + 1;

    const matBonus = summonType === 'elite' ? 1 : 0;
    const matCount = rand(1, strong ? 3 : 2) + matBonus;
    const matId = 'mat_' + rand(1, 4);
    state.materials[matId] = (state.materials[matId] || 0) + matCount;
    log(`獲得魔獸殘片 x${matCount}`, '', 'loot');
    spawnFloat(`+${matCount} 殘片`, 'float-loot');

    // Elemental summon always drops an element; normal/elite only on strong
    if (strong || summonType === 'element') {
      const elem = pick(ELEMENT_NAMES);
      state.elements[elem] = (state.elements[elem] || 0) + 1;
      log(`獲得進階元素：${elem}`, 'loot-up', 'loot');
    }

    // Phase 3: mage talent elem bonus
    if (Math.random() < getTalentBonus('elemBonus')) {
      const elem = pick(ELEMENT_NAMES);
      state.elements[elem] = (state.elements[elem] || 0) + 1;
      log(`🔮 元素天賦觸發：${elem}`, 'loot-up', 'loot');
    }

    // Elite summon has improved equipment drop rate
    const equipBaseRoll = strong ? 0.6 : 0.3;
    const equipRoll = summonType === 'elite' ? Math.min(equipBaseRoll + 0.3, 0.9) : equipBaseRoll;
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
      // Track collected affix for catalogue
      state.collectedAffixes = state.collectedAffixes || {};
      state.collectedAffixes[affix] = (state.collectedAffixes[affix] || 0) + 1;
      log(`獲得裝備【${affix}】（${slot}）`, 'loot-up', 'loot');
      spawnFloat(`+裝備【${affix}】`, 'float-loot');
    }

    advanceStageProgress();
    renderQuests();
    renderAchievements();
    renderCatalogue();
  }

  function performPlayerAction(action) {
    if (!state.currentEnemy) return;
    const enemy = state.currentEnemy;
    const playerStatus = state.battle.playerStatus;
    const enemyStatus = state.battle.enemyStatus;

    if (action === 'attack') {
      const { dmg, isCrit } = computePlayerDamage(1);
      enemy.hp -= dmg;
      spawnFloat((isCrit ? '💥' : '') + dmg, 'float-atk');
      panelLog('battleLog', `你使用普攻造成 ${dmg} 點傷害。${isCrit ? '（暴擊！）' : ''}`);
    } else if (action === 'heavy') {
      const { dmg, isCrit } = computePlayerDamage(1.7);
      enemy.hp -= dmg;
      const selfCost = 5;
      state.hp = Math.max(1, state.hp - selfCost);
      spawnFloat((isCrit ? '💥' : '') + dmg, 'float-atk');
      panelLog('battleLog', `你使用重擊造成 ${dmg} 點傷害，自己承受 ${selfCost} 點反作用力。${isCrit ? '（暴擊！）' : ''}`);
      if (Math.random() < 0.2) {
        enemyStatus.stunnedTurns = 1;
        panelLog('battleLog', '敵人被暈眩一回合！');
      }
      const bleedChance = 0.5 + getTalentBonus('bleedChance');
      if (Math.random() < bleedChance) {
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
      autoSave();
      return;
    }

    if (enemyStatus.stunnedTurns > 0) {
      enemyStatus.stunnedTurns -= 1;
      panelLog('battleLog', '敵人暈眩中，無法行動。');
    } else {
      const taken = computeEnemyDamage(enemy);
      state.hp = Math.max(0, state.hp - taken);
      spawnFloat('-' + taken, 'float-dmg');
      panelLog('battleLog', `對方反擊，你受到 ${taken} 點傷害。`);
    }

    updateStats();
    renderBattle();

    if (state.hp <= 0) {
      panelLog('battleLog', '你已倒下，玩家狀態已重置至初始並重新開始。');
      log('你倒下了，所有玩家狀態已回到初始值。');
      resetPlayerToInitial();
    } else {
      autoSave();
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
        autoSave();
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
    autoSave();
  }


  // ----- Phase 2: Special Store & Shop Refresh -----
  function getSpecialStoreSlots() {
    const idx = state.shopRefreshIndex || 0;
    const slots = [];
    for (let i = 0; i < SPECIAL_STORE_SLOT_COUNT; i++) {
      slots.push(SPECIAL_STORE_POOL[(idx + i) % SPECIAL_STORE_POOL.length]);
    }
    return slots;
  }

  function renderSpecialStore() {
    const list = document.getElementById('specialStoreList');
    const btn = document.getElementById('btnShopRefresh');
    if (!list) return;
    const slots = getSpecialStoreSlots();
    list.innerHTML = slots.map(item => {
      const isGem = item.currency === 'gems';
      const balance = isGem ? (state.gems || 0) : state.gold;
      const canBuy = balance >= item.price;
      const priceStr = isGem
        ? `<span class="gem-price">💎 ${item.price}</span>`
        : `💰 ${item.price}`;
      return `
        <div class="item-card">
          <span class="name">${item.name}</span>
          <span class="desc">${item.desc}</span>
          <span class="price">${priceStr}</span>
          <button ${!canBuy ? 'disabled' : ''} data-id="${item.id}" data-price="${item.price}" data-currency="${item.currency}">購買</button>
        </div>`;
    }).join('');
    list.querySelectorAll('button').forEach(buyBtn => {
      buyBtn.addEventListener('click', () => {
        buyItem(buyBtn.dataset.id, parseInt(buyBtn.dataset.price, 10), buyBtn.dataset.currency);
      });
    });
    if (btn) btn.disabled = state.gold < 15;
  }

  function shopRefresh() {
    if (state.gold < 15) return;
    const poolLength = SPECIAL_STORE_POOL.length;
    const slotCount = SPECIAL_STORE_SLOT_COUNT;
    const currentIndex = state.shopRefreshIndex || 0;

    // Collect IDs currently visible
    const currentIds = new Set();
    for (let i = 0; i < slotCount; i++) {
      const item = SPECIAL_STORE_POOL[(currentIndex + i) % poolLength];
      if (item && item.id !== null && item.id !== undefined) currentIds.add(item.id);
    }

    // Find the next start index with minimum overlap with current slots
    const defaultNextIndex = (currentIndex + slotCount) % poolLength;
    let bestIndex = defaultNextIndex;
    let bestOverlap = Number.POSITIVE_INFINITY;
    for (let candidate = 0; candidate < poolLength; candidate++) {
      if (candidate === currentIndex) continue;
      let overlap = 0;
      for (let i = 0; i < slotCount; i++) {
        const item = SPECIAL_STORE_POOL[(candidate + i) % poolLength];
        if (item && item.id !== null && item.id !== undefined && currentIds.has(item.id)) overlap++;
      }
      if (overlap < bestOverlap ||
          (overlap === bestOverlap && candidate === defaultNextIndex)) {
        bestOverlap = overlap;
        bestIndex = candidate;
      }
    }

    state.gold -= 15;
    state.shopRefreshIndex = bestIndex;
    log('特殊商品已刷新。', '', 'system');
    updateStats();
    renderStore();
    renderSpecialStore();
    autoSave();
  }

  // ----- Phase 2: Quest helpers -----
  function getQuestProgress(quest) {
    const s = state.stats || {};
    if (quest.type === 'kills') return s.totalKills || 0;
    if (quest.type === 'strongKills') return s.strongKills || 0;
    if (quest.type === 'purchases') return s.totalPurchases || 0;
    if (quest.type === 'stage') return s.maxStage || 1;
    if (quest.type === 'encountered') return Object.keys(state.encountered || {}).length;
    return 0;
  }

  function renderQuests() {
    const list = document.getElementById('questList');
    if (!list) return;
    list.innerHTML = DAILY_QUESTS.map(quest => {
      const progress = getQuestProgress(quest);
      const pct = Math.min(100, Math.round(progress / quest.target * 100));
      const done = progress >= quest.target;
      const claimed = !!(state.questClaimed || {})[quest.id];
      const rewardStr = Object.entries(quest.reward).map(([k, v]) => k === 'gems' ? `💎${v}` : `💰${v}`).join(' ');
      const btnLabel = claimed ? '已領取' : done ? '領取獎勵' : '未完成';
      const cardClass = claimed ? 'quest-card claimed' : done ? 'quest-card completed' : 'quest-card';
      return `
        <div class="${cardClass}">
          <div class="quest-desc">${quest.desc}</div>
          <div class="quest-progress-row">
            <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
            <span class="progress-label">${progress}/${quest.target}</span>
          </div>
          <div class="quest-reward-label">獎勵：${rewardStr}</div>
          <button class="claim-btn" data-quest="${quest.id}" ${(!done || claimed) ? 'disabled' : ''}>${btnLabel}</button>
        </div>`;
    }).join('');
    list.querySelectorAll('.claim-btn').forEach(btn => {
      btn.addEventListener('click', () => claimQuest(btn.dataset.quest));
    });
  }

  function claimQuest(questId) {
    const quest = DAILY_QUESTS.find(q => q.id === questId);
    if (!quest) return;
    if ((state.questClaimed || {})[questId]) return;
    if (getQuestProgress(quest) < quest.target) return;
    state.questClaimed = state.questClaimed || {};
    state.questClaimed[questId] = true;
    if (quest.reward.gold) state.gold += quest.reward.gold;
    if (quest.reward.gems) state.gems = (state.gems || 0) + quest.reward.gems;
    const rewardStr = Object.entries(quest.reward).map(([k, v]) => k === 'gems' ? `💎${v}` : `💰${v}`).join(' ');
    panelLog('questLog', `✅ 領取任務【${quest.desc}】獎勵：${rewardStr}`, 'loot-up');
    updateStats();
    renderStore();
    renderSpecialStore();
    renderQuests();
    autoSave();
  }

  // ----- Phase 2: Achievement helpers -----
  function getAchievementProgress(ach) {
    const s = state.stats || {};
    if (ach.type === 'kills') return s.totalKills || 0;
    if (ach.type === 'strongKills') return s.strongKills || 0;
    if (ach.type === 'stage') return s.maxStage || 1;
    if (ach.type === 'encountered') return Object.keys(state.encountered || {}).length;
    return 0;
  }

  function renderAchievements() {
    const list = document.getElementById('achievementList');
    if (!list) return;
    list.innerHTML = ACHIEVEMENTS.map(ach => {
      const progress = getAchievementProgress(ach);
      const pct = Math.min(100, Math.round(progress / ach.target * 100));
      const done = progress >= ach.target;
      const claimed = !!(state.achClaimed || {})[ach.id];
      const rewardStr = Object.entries(ach.reward).map(([k, v]) => k === 'gems' ? `💎${v}` : `💰${v}`).join(' ');
      const btnLabel = claimed ? '已領取' : done ? '領取獎勵' : '未完成';
      const cardClass = claimed ? 'quest-card claimed' : done ? 'quest-card completed' : 'quest-card';
      return `
        <div class="${cardClass}">
          <div class="quest-desc">${ach.desc}</div>
          <div class="quest-progress-row">
            <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
            <span class="progress-label">${progress}/${ach.target}</span>
          </div>
          <div class="quest-reward-label">獎勵：${rewardStr}</div>
          <button class="claim-btn" data-ach="${ach.id}" ${(!done || claimed) ? 'disabled' : ''}>${btnLabel}</button>
        </div>`;
    }).join('');
    list.querySelectorAll('.claim-btn').forEach(btn => {
      btn.addEventListener('click', () => claimAch(btn.dataset.ach));
    });
  }

  function claimAch(achId) {
    const ach = ACHIEVEMENTS.find(a => a.id === achId);
    if (!ach) return;
    if ((state.achClaimed || {})[achId]) return;
    if (getAchievementProgress(ach) < ach.target) return;
    state.achClaimed = state.achClaimed || {};
    state.achClaimed[achId] = true;
    if (ach.reward.gold) state.gold += ach.reward.gold;
    if (ach.reward.gems) state.gems = (state.gems || 0) + ach.reward.gems;
    const rewardStr = Object.entries(ach.reward).map(([k, v]) => k === 'gems' ? `💎${v}` : `💰${v}`).join(' ');
    panelLog('achievementLog', `🏆 解鎖成就【${ach.desc}】獎勵：${rewardStr}`, 'loot-up');
    updateStats();
    renderStore();
    renderSpecialStore();
    renderAchievements();
    autoSave();
  }

  // ----- Phase 2: Catalogue -----
  function renderCatalogue() {
    const list = document.getElementById('catalogueList');
    if (!list) return;

    const encCount = Object.keys(state.encountered || {}).length;
    const enemyGrid = ENEMY_PROFILES.map(p => {
      const seen = !!(state.encountered || {})[p.id];
      const typeLabel = ENEMY_TYPE_LABELS[p.type] || p.type;
      return seen
        ? `<div class="catalogue-item encountered"><div class="cat-name">${p.name}</div><div class="cat-type">${typeLabel}</div></div>`
        : `<div class="catalogue-item unseen"><div class="cat-name">???</div><div class="cat-type">未遭遇</div></div>`;
    }).join('');

    const affixCount = Object.keys(state.collectedAffixes || {}).length;
    const affixGrid = AFFIXES.map(affix => {
      const count = (state.collectedAffixes || {})[affix] || 0;
      return count > 0
        ? `<div class="catalogue-item collected"><div class="cat-name">${affix}</div><div class="cat-type">×${count}</div></div>`
        : `<div class="catalogue-item uncollected"><div class="cat-name">${affix}</div><div class="cat-type">未收集</div></div>`;
    }).join('');

    list.innerHTML = `
      <div class="catalogue-section">
        <h3>怪物圖鑑（${encCount}/${ENEMY_PROFILES.length} 已遭遇）</h3>
        <div class="catalogue-grid">${enemyGrid}</div>
      </div>
      <div class="catalogue-section">
        <h3>詞綴圖鑑（${affixCount}/${AFFIXES.length} 已收集）</h3>
        <div class="catalogue-grid">${affixGrid}</div>
      </div>`;
  }

  // ----- Phase 3: 天賦樹 -----
  function renderTalent() {
    const panel = document.getElementById('talentPanel');
    if (!panel) return;
    const tp = state.talentPoints || 0;
    if (!state.talentSpec) {
      panel.innerHTML = `
        <p class="hint">選擇一個職業路線（選擇後可換職，已分配點數將重置）：</p>
        <div class="talent-spec-grid">
          ${Object.entries(TALENT_SPECS).map(([key, spec]) => `
            <div class="talent-spec-card">
              <div class="talent-spec-icon">${spec.icon}</div>
              <div class="talent-spec-name">${spec.name}</div>
              <div class="talent-spec-desc">${spec.desc}</div>
              <button class="btn talent-spec-btn" data-spec="${key}">選擇職業</button>
            </div>`).join('')}
        </div>`;
      panel.querySelectorAll('.talent-spec-btn').forEach(btn => {
        btn.addEventListener('click', () => chooseTalentSpec(btn.dataset.spec));
      });
    } else {
      const spec = TALENT_SPECS[state.talentSpec];
      const alloc = state.talentAlloc || {};
      panel.innerHTML = `
        <div class="talent-spec-header">
          <span>${spec.icon} ${spec.name} — ${spec.desc}</span>
          <button class="btn talent-change-btn">換職業</button>
        </div>
        <div class="talent-grid">
          ${spec.talents.map(t => {
            const level = alloc[t.id] || 0;
            const maxed = level >= t.maxLevel;
            const canAlloc = !maxed && tp > 0;
            return `<div class="talent-card${maxed ? ' maxed' : ''}">
              <div class="talent-name">${t.name}</div>
              <div class="talent-desc">${t.desc}</div>
              <div class="talent-level">Lv.${level}/${t.maxLevel}</div>
              <button class="talent-alloc-btn" data-talent="${t.id}" ${!canAlloc ? 'disabled' : ''}>分配（消耗 1 點）</button>
            </div>`;
          }).join('')}
        </div>`;
      panel.querySelectorAll('.talent-change-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.talentSpec = null;
          state.talentAlloc = {};
          recalcStatsFromBaseAndEquipment();
          updateStats();
          renderTalent();
        });
      });
      panel.querySelectorAll('.talent-alloc-btn').forEach(btn => {
        btn.addEventListener('click', () => allocateTalent(btn.dataset.talent));
      });
    }
  }

  function chooseTalentSpec(spec) {
    if (!TALENT_SPECS[spec]) return;
    state.talentSpec = spec;
    state.talentAlloc = {};
    recalcStatsFromBaseAndEquipment();
    updateStats();
    renderTalent();
    log(`選擇職業：${TALENT_SPECS[spec].name}`, '', 'system');
    autoSave();
  }

  function allocateTalent(talentId) {
    const alloc = state.talentAlloc || {};
    const currentLevel = alloc[talentId] || 0;
    let maxLevel = 1;
    for (const spec of Object.values(TALENT_SPECS)) {
      const t = spec.talents.find(t => t.id === talentId);
      if (t) { maxLevel = t.maxLevel; break; }
    }
    if (currentLevel >= maxLevel) return;
    if ((state.talentPoints || 0) <= 0) return;
    state.talentAlloc = state.talentAlloc || {};
    state.talentAlloc[talentId] = currentLevel + 1;
    state.talentPoints = state.talentPoints - 1;
    recalcStatsFromBaseAndEquipment();
    updateStats();
    renderTalent();
    log(`分配天賦：${talentId} Lv.${state.talentAlloc[talentId]}`, '', 'system');
    autoSave();
  }

  // ----- Phase 3: Log filter -----
  function initLogFilter() {
    const bar = document.getElementById('logFilterBar');
    if (!bar) return;
    bar.querySelectorAll('.log-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        bar.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.logFilter = btn.dataset.filter || 'all';
        renderGameLog();
      });
    });
  }

  // ----- Phase 3: Offline earnings -----
  function initOfflineRewards() {
    const now = Date.now();
    const lastSave = state.lastSaveTime || 0;
    state.lastSaveTime = now;
    if (lastSave === 0) return;
    const elapsed = now - lastSave;
    if (elapsed < MIN_OFFLINE_MS) return;
    const elapsedCapped = Math.min(elapsed, MAX_OFFLINE_MS);
    const elapsedMinutes = Math.floor(elapsedCapped / 60000);
    const stage = Math.max(1, state.stage || 1);
    const goldEarned = elapsedMinutes * stage * 2;
    const matsEarned = Math.max(1, Math.floor(elapsedMinutes * 0.5));
    state.gold += goldEarned;
    const matId = 'mat_' + rand(1, 4);
    state.materials[matId] = (state.materials[matId] || 0) + matsEarned;
    log(`💤 離線收益（${elapsedMinutes} 分鐘）：💰 ${goldEarned}，魔獸殘片 x${matsEarned}`, 'loot-up', 'system');
    const modal = document.getElementById('offlineModal');
    const summEl = document.getElementById('offlineSummary');
    if (summEl) summEl.textContent = `離線 ${elapsedMinutes} 分鐘（第 ${stage} 層）→ 💰 ${goldEarned}，魔獸殘片 x${matsEarned}`;
    if (modal) modal.classList.remove('hidden');
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
        showPanelTip(id);
        if (id === 'store') {
          renderStore();
          renderSpecialStore();
        }
        if (id === 'leaderboard') renderLeaderboard();
      });
    });
  }

  // ─── CS-02/03: Save / Load (API with localStorage fallback) ──────────────

  var SAVE_SLOT = 'default';
  var LS_KEY_BASE = 'minetobattle_save';
  var AUTH_TOKEN_KEY = 'minetobattle_auth_token';
  var AUTH_USER_KEY = 'minetobattle_auth_user';
  var currentAuthUser = '';
  var authToken = '';
  var _autoSaveTimer = null;
  var AUTO_SAVE_DELAY_MS = 2000; // debounce: 2 s after last action

  function getPlayerDisplayName() {
    return currentAuthUser || '冒險者';
  }

  function getLocalSaveKey() {
    return currentAuthUser ? (LS_KEY_BASE + '_' + currentAuthUser) : (LS_KEY_BASE + '_guest');
  }

  function getAuthHeaders() {
    if (!authToken) return {};
    return { Authorization: 'Bearer ' + authToken };
  }

  function isLoggedIn() {
    return !!(currentAuthUser && authToken);
  }

  function setAuthState(username, token) {
    currentAuthUser = username || '';
    authToken = token || '';
    try {
      if (currentAuthUser && authToken) {
        localStorage.setItem(AUTH_USER_KEY, currentAuthUser);
        localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch (e) { /* ignore */ }
    renderAuthStatus();
  }

  function renderAuthStatus(message) {
    var authBar = document.querySelector('.auth-bar');
    var statusEl = document.getElementById('authStatus');
    var logoutBtn = document.getElementById('btnLogout');
    var userInput = document.getElementById('authUsername');
    var passInput = document.getElementById('authPassword');
    var registerBtn = document.getElementById('btnRegister');
    var loginBtn = document.getElementById('btnLogin');
    var logged = isLoggedIn();

    if (authBar && authBar.classList) authBar.classList.toggle('logged-in', logged);

    if (userInput) userInput.classList.toggle('hidden', logged);
    if (passInput) passInput.classList.toggle('hidden', logged);
    if (registerBtn) registerBtn.classList.toggle('hidden', logged);
    if (loginBtn) loginBtn.classList.toggle('hidden', logged);
    if (logoutBtn) logoutBtn.disabled = !isLoggedIn();
    if (!statusEl) return;
    if (message) {
      statusEl.textContent = message;
      return;
    }
    statusEl.textContent = logged
      ? ('已登入：' + currentAuthUser + '（伺服器存檔綁定此帳號）')
      : '未登入（僅本地存檔）';
  }

  function registerPlayer() {
    var userInput = document.getElementById('authUsername');
    var passInput = document.getElementById('authPassword');
    var username = userInput ? userInput.value.trim().toLowerCase() : '';
    var password = passInput ? passInput.value : '';
    if (!username || !password) {
      renderAuthStatus('請輸入帳號與密碼');
      return;
    }
    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    }).then(function (r) {
      return r.json().then(function (body) { return { ok: r.ok, body: body }; });
    }).then(function (result) {
      if (!result.ok || !result.body || !result.body.ok) {
        renderAuthStatus('註冊失敗：' + ((result.body && result.body.error) || '未知錯誤'));
        return;
      }
      setAuthState(result.body.username, result.body.token);
      if (passInput) passInput.value = '';
      renderAuthStatus('註冊成功，已登入：' + result.body.username);
      loadFromServer(function () { /* ignore */ });
    }).catch(function () {
      renderAuthStatus('註冊失敗：無法連線伺服器');
    });
  }

  function loginPlayer() {
    var userInput = document.getElementById('authUsername');
    var passInput = document.getElementById('authPassword');
    var username = userInput ? userInput.value.trim().toLowerCase() : '';
    var password = passInput ? passInput.value : '';
    if (!username || !password) {
      renderAuthStatus('請輸入帳號與密碼');
      return;
    }
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    }).then(function (r) {
      return r.json().then(function (body) { return { ok: r.ok, body: body }; });
    }).then(function (result) {
      if (!result.ok || !result.body || !result.body.ok) {
        renderAuthStatus('登入失敗：' + ((result.body && result.body.error) || '未知錯誤'));
        return;
      }
      setAuthState(result.body.username, result.body.token);
      if (passInput) passInput.value = '';
      renderAuthStatus('登入成功：' + result.body.username);
      loadFromServer(function () { /* ignore */ });
    }).catch(function () {
      renderAuthStatus('登入失敗：無法連線伺服器');
    });
  }

  function logoutPlayer() {
    setAuthState('', '');
    renderAuthStatus('已登出，切回本地存檔');
    loadFromLocalStorage(function () { /* ignore */ });
  }

  function initAuthUI() {
    var registerBtn = document.getElementById('btnRegister');
    var loginBtn = document.getElementById('btnLogin');
    var logoutBtn = document.getElementById('btnLogout');
    if (registerBtn) registerBtn.addEventListener('click', registerPlayer);
    if (loginBtn) loginBtn.addEventListener('click', loginPlayer);
    if (logoutBtn) logoutBtn.addEventListener('click', logoutPlayer);
    try {
      const savedUser = localStorage.getItem(AUTH_USER_KEY) || '';
      const savedToken = localStorage.getItem(AUTH_TOKEN_KEY) || '';
      if (savedUser && savedToken) {
        setAuthState(savedUser, savedToken);
      } else {
        renderAuthStatus();
      }
    } catch (e) {
      renderAuthStatus();
    }
  }

  function autoSave() {
    if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(function () {
      saveToServer(function (err) {
        if (err) showSaveStatus('⚠️ 自動備份（本地）');
      });
    }, AUTO_SAVE_DELAY_MS);
  }

  function autoLoad() {
    loadFromServer(function (err, data) {
      if (!err && data && data.ok) {
        showSaveStatus(data.local ? '📂 已從本地備份載入' : '📂 已從伺服器載入');
      }
    });
  }

  function saveToServer(callback) {
    var payload = JSON.stringify({ slot: SAVE_SLOT, state: state });
    if (typeof fetch !== 'undefined' && isLoggedIn()) {
      fetch('/api/save', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, getAuthHeaders()),
        body: payload
      }).then(function (r) { return r.json(); }).then(function (data) {
        try { localStorage.setItem(getLocalSaveKey(), JSON.stringify(state)); } catch (e) { /* ignore */ }
        if (callback) callback(null, data);
      }).catch(function (err) {
        try { localStorage.setItem(getLocalSaveKey(), JSON.stringify(state)); } catch (e) { /* ignore */ }
        if (callback) callback(err);
      });
    } else {
      try { localStorage.setItem(getLocalSaveKey(), JSON.stringify(state)); } catch (e) { /* ignore */ }
      if (callback) callback(null, { ok: true, local: true });
    }
  }

  function loadFromServer(callback) {
    if (typeof fetch !== 'undefined' && isLoggedIn()) {
      fetch('/api/load?slot=' + SAVE_SLOT, {
        headers: getAuthHeaders()
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.ok && data.state) {
            applyLoadedState(data.state);
            if (callback) callback(null, data);
          } else {
            loadFromLocalStorage(callback);
          }
        }).catch(function () {
          loadFromLocalStorage(callback);
        });
    } else {
      loadFromLocalStorage(callback);
    }
  }

  function loadFromLocalStorage(callback) {
    try {
      var raw = localStorage.getItem(getLocalSaveKey());
      if (raw) {
        var saved = JSON.parse(raw);
        applyLoadedState(saved);
        if (callback) callback(null, { ok: true, local: true });
      } else {
        if (callback) callback(null, { ok: false });
      }
    } catch (e) {
      if (callback) callback(e);
    }
  }

  function applyLoadedState(saved) {
    if (!saved || typeof saved !== 'object') return;
    Object.keys(saved).forEach(function (k) { state[k] = saved[k]; });
    resetBattleState();
    syncStageTarget();
    recalcStatsFromBaseAndEquipment();
    updateStats();
    renderStore();
    renderSpecialStore();
    renderBattle();
    renderExchange();
    renderInventory();
    renderQuests();
    renderAchievements();
    renderCatalogue();
    renderTalent();
  }

  function showSaveStatus(msg) {
    var el = document.getElementById('saveStatus');
    if (el) {
      el.textContent = msg;
      setTimeout(function () { if (el.textContent === msg) el.textContent = ''; }, 3000);
    }
  }

  // ─── CS-04: Leaderboard ──────────────────────────────────────────────────

  function calcScore() {
    var maxStage = (state.stats && state.stats.maxStage) || state.stage || 1;
    var kills = (state.stats && state.stats.totalKills) || 0;
    return maxStage * 10 + kills;
  }

  function submitLeaderboard(playerName) {
    if (typeof fetch === 'undefined') return;
    var entry = {
      name: playerName || '冒險者',
      score: calcScore(),
      stage: (state.stats && state.stats.maxStage) || state.stage || 1,
      kills: (state.stats && state.stats.totalKills) || 0
    };
    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).catch(function () { /* fire-and-forget */ });
  }

  function renderLeaderboard() {
    var el = document.getElementById('leaderboardList');
    if (!el) return;
    if (typeof fetch === 'undefined') {
      el.innerHTML = '<p class="hint">排行榜需要伺服器連線。</p>';
      return;
    }
    el.innerHTML = '<p class="hint">載入中…</p>';
    fetch('/api/leaderboard')
      .then(function (r) { return r.json(); })
      .then(function (board) {
        if (!Array.isArray(board) || board.length === 0) {
          el.innerHTML = '<p class="hint">尚無記錄。擊敗怪物、通關層數後死亡即可留下成績！</p>';
          return;
        }
        var rows = board.map(function (e, i) {
          return '<div class="leaderboard-row">' +
            '<span class="lb-rank">#' + (i + 1) + '</span>' +
            '<span class="lb-name">' + escHtml(e.name) + '</span>' +
            '<span class="lb-score">分數: ' + e.score + '</span>' +
            '<span class="lb-detail">層' + e.stage + ' / 擊殺' + e.kills + '</span>' +
            '</div>';
        }).join('');
        el.innerHTML = rows;
      }).catch(function () {
        el.innerHTML = '<p class="hint">無法連線至伺服器，排行榜暫時不可用。</p>';
      });
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function initServerButtons() {
    var refreshBtn2 = document.getElementById('btnRefreshLeaderboard');
    if (refreshBtn2) {
      refreshBtn2.addEventListener('click', renderLeaderboard);
    }
  }

  document.getElementById('btnSummon').addEventListener('click', () => doSummon('normal'));
  const eliteBtn = document.getElementById('btnEliteSummon');
  if (eliteBtn) eliteBtn.addEventListener('click', () => doSummon('elite'));
  const elementBtn = document.getElementById('btnElementSummon');
  if (elementBtn) elementBtn.addEventListener('click', () => doSummon('element'));
  const refreshBtn = document.getElementById('btnShopRefresh');
  if (refreshBtn) refreshBtn.addEventListener('click', shopRefresh);
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
  renderSpecialStore();
  renderBattle();
  renderExchange();
  renderInventory();
  renderQuests();
  renderAchievements();
  renderCatalogue();
  renderTalent();
  initLogFilter();
  initOfflineRewards();
  initServerButtons();
  initAuthUI();
  autoLoad();

  // Phase 3: tip close buttons (event delegation)
  if (document.addEventListener) {
    document.addEventListener('click', function (e) {
      const btn = e.target;
      if (btn && btn.classList && btn.classList.contains('tip-close')) {
        const tipId = btn.getAttribute('data-tip');
        if (!tipId) return;
        const el = document.getElementById(tipId);
        if (el && el.classList) el.classList.add('hidden');
        state.seenTips = state.seenTips || {};
        state.seenTips[tipId] = true;
      }
    });
  }

  // Phase 3: story modal close
  const storyCloseBtn = document.getElementById('btnStoryClose');
  if (storyCloseBtn) storyCloseBtn.addEventListener('click', function () {
    const modal = document.getElementById('storyModal');
    if (modal) modal.classList.add('hidden');
  });

  // Phase 3: offline modal close
  const offlineCloseBtn = document.getElementById('btnOfflineClose');
  if (offlineCloseBtn) offlineCloseBtn.addEventListener('click', function () {
    const modal = document.getElementById('offlineModal');
    if (modal) modal.classList.add('hidden');
  });
})();
