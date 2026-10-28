/* 公共：常量 / 工具函数 / 数据存储与迁移 */
'use strict';

  var STORAGE_KEY = 'driver-salary-v1';
  var DAILY_WAGE = 200;
  var FUEL_PER_KM = 0.34;
  var SAVING_PRICE = 4.5;

  /* ===== 高德地图配置（在这里填你自己的 Key） ===== */
  var AMAP_KEY = '35ff17adac7d27b664587854d5538448';                 // 高德 JS API Key
  var AMAP_SECURITY_CODE = '1ce351cd7b768471d33f0b94c8e6b407';  // 高德安全密钥（2022 年后新 Key 必须填）

  var state = { month: '', page: 'settlement', routeSort: 'name', tripMode: 'template' };
  var db;

  /* ================= 工具 ================= */
  function $(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
      }
    );
  }

  var numberFormat = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function fmt2(value) {
    return numberFormat.format(Number(value) || 0);
  }

  function yuan(value) {
    var amount = Number(value) || 0;
    return (amount < 0 ? '-¥' : '¥') + fmt2(Math.abs(amount));
  }

  function round2(value) {
    var number = Number(value) || 0;
    return Math.round((number + (number >= 0 ? 1 : -1) * Number.EPSILON) * 100) / 100;
  }

  function monthLabel(month) {
    var parts = String(month).split('-');
    return parts[0] + '年' + Number(parts[1]) + '月';
  }

  function todayString() {
    var now = new Date();
    return (
      now.getFullYear() +
      '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getDate()).padStart(2, '0')
    );
  }

  function validDate(text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    var date = new Date(text + 'T00:00:00');
    if (isNaN(date.getTime())) return false;
    return (
      text ===
      date.getFullYear() +
        '-' +
        String(date.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(date.getDate()).padStart(2, '0')
    );
  }

  function parseNumber(value, label, minimum) {
    var min = minimum === undefined ? 0 : minimum;
    if (value === '' || value === null || value === undefined) {
      throw new Error('请填写' + label);
    }
    var number = Number(value);
    if (!isFinite(number)) throw new Error(label + '必须是数字');
    if (number < min) throw new Error(label + '不能小于 ' + min);
    return number;
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1500);
  }

  var toastTimer = null;
  function toast(message, type) {
    var element = $('toast');
    element.textContent = message;
    element.className = 'toast show';
    if (type === 'error') element.classList.add('error');
    else if (type === 'success') element.classList.add('success');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      element.className = 'toast';
    }, 2400);
  }

  /* ================= 数据存储（云端优先 + 离线降级） ================= */
  function defaultDb() {
    return {
      configs: {
        origins:   ['新库', '东库'],
        dest_in:   ['外一', '外二', '外四', '外五', '洋山', '洋山（查验）'],
        dest_pick: ['洋山', '沧海路', '德威八分', '外通', '东森', '外一', '外二', '外四', '外五'],
        // 进目的地的区域分组（固定三组，不可增删，仅可改名）
        dest_groups: [
          { id: 'zone-ab', label: '外一外二系', desc: '靠近外一外二的目的地',
            members: ['外一', '外二'] },
          { id: 'zone-cd', label: '外四外五系', desc: '靠近外四外五的目的地',
            members: ['外四', '外五'] },
          { id: 'zone-ys', label: '洋山系', desc: '独立计算公里的洋山区域',
            members: ['洋山', '洋山（查验）'] },
        ],
        // 提 / 还目的地的区域分组（可自由增删，主要影响地图分组）
        dest_pick_groups: [
          { id: 'zone-cw', label: '超外系', desc: '超外区域的目的地',
            members: [] },
          { id: 'zone-ab', label: '外一外二系', desc: '靠近外一外二的目的地',
            members: ['德威八分', '东森', '外一', '外二', '外通'] },
          { id: 'zone-cd', label: '外四外五系', desc: '靠近外四外五的目的地',
            members: ['外四', '外五'] },
          { id: 'zone-wn', label: '外内系', desc: '外内区域的目的地',
            members: [] },
          { id: 'zone-ys', label: '洋山系', desc: '独立计算公里的洋山区域',
            members: ['沧海路', '洋山', '洋山（查验）'] },
        ],
        // 基础公里表：始发地 → 各目的地的单段公里
        base_km: {
          '东库': {
            '外一': 60, '外二': 60, '外四': 40, '外五': 40,
            '洋山': 200, '洋山（查验）': 200,
            '沧海路': 200, '德威八分': 60, '外通': 60, '东森': 60,
          },
          '新库': {
            '外一': 70, '外二': 70, '外四': 50, '外五': 50,
            '洋山': 190, '洋山（查验）': 190,
            '沧海路': 190, '德威八分': 70, '外通': 70, '东森': 70,
          },
        },
        // 地点坐标：{ 地点名: { lat, lng } }，用于地图标注
        coords: {},
      },
      drivers: [],
      routes: [],
      trips: [],
      fuel: [],
      attendance: [],
    };
  }

  /** 查某段路线的基础公里 */
  function lookupBaseKm(origin, dest) {
    var table = db.configs.base_km || {};
    var row = table[origin] || {};
    var v = row[dest];
    return typeof v === 'number' ? v : null;
  }

  /** 标准分组名称 → 内置 id：同名分组一律合并到内置组，颜色才不会乱 */
  var BUILTIN_GROUP_IDS = {
    '超外系': 'zone-cw',
    '外一外二系': 'zone-ab',
    '外四外五系': 'zone-cd',
    '外内系': 'zone-wn',
    '洋山系': 'zone-ys',
  };

  /** 合并同名分组：保留第一个，其余成员并入；内置名称的组统一改用内置 id */
  function mergeSameLabelGroups(list) {
    if (!Array.isArray(list)) return [];
    var out = [];
    var byLabel = {};
    var usedId = {};
    list.forEach(function (g) {
      if (!g || typeof g !== 'object') return;
      var label = String(g.label || '').trim();
      if (!label) return;
      if (byLabel[label]) {
        // 历史上用户自建过同名分组 → 成员并入，丢掉重复的那个
        (g.members || []).forEach(function (m) {
          if (m && byLabel[label].members.indexOf(m) < 0) byLabel[label].members.push(m);
        });
        return;
      }
      var copy = {
        id: g.id || ('zone-' + Math.random().toString(36).slice(2, 8)),
        label: label,
        desc: g.desc || '',
        members: (g.members || []).slice(),
        color: g.color || '',
      };
      byLabel[label] = copy;
      usedId[copy.id] = true;
      out.push(copy);
    });
    // 名称是标准名、id 却不是内置 id → 改回内置 id（地图取色按 id，紫色/蓝色等才稳定）
    out.forEach(function (g) {
      var want = BUILTIN_GROUP_IDS[g.label];
      if (want && g.id !== want && !usedId[want]) {
        delete usedId[g.id];
        g.id = want;
        usedId[want] = true;
      }
    });
    // 不再强制排序：顺序由用户在地图/管理里拖动决定，刷新后必须原样保留
    return out;
  }

  function nameSet(list) {
    var set = {};
    (list || []).forEach(function (n) { set[n] = true; });
    return set;
  }

  /** 恢复上一版迁移弄丢的提还分组归属：
   *  旧版迁移把「进+提还」合并分组的成员全灌进了 dest_groups，提还分组却被默认值顶掉。
   *  这里把不属于进目的地的成员，按原分组 id 还原进提还分组（只补当前未分组的），
   *  并把 dest_groups 里残留的提还地点清掉。跑过一次后数据已干净，再执行不会有变化。 */
  function restorePickAssignments(cfg) {
    var inSet = nameSet(cfg.dest_in);
    var pickSet = nameSet(cfg.dest_pick);
    var pickHas = {};
    (cfg.dest_pick_groups || []).forEach(function (g) {
      (g.members || []).forEach(function (m) { if (m && !pickHas[m]) pickHas[m] = g.id; });
    });
    (cfg.dest_groups || []).forEach(function (g) {
      var keep = [];
      var restore = [];
      (g.members || []).forEach(function (m) {
        if (!m) return;
        if (inSet[m]) { keep.push(m); return; }
        if (pickSet[m] && !pickHas[m]) restore.push(m);
      });
      g.members = keep;
      var target = (cfg.dest_pick_groups || []).filter(function (pg) { return pg.id === g.id; })[0];
      if (!target) return;
      target.members = target.members || [];
      restore.forEach(function (m) {
        if (target.members.indexOf(m) < 0) target.members.push(m);
        pickHas[m] = target.id;
      });
    });
  }

  /** 进 + 提还两套分组一起查（地图与公里判断都要用到） */
  function allDestGroups() {
    var cfg = db.configs || {};
    return (cfg.dest_groups || []).concat(cfg.dest_pick_groups || []);
  }

  /** 判断两个目的地是否属于同一个区域（用于公里计算去重） */
  function sameDestGroup(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    var groups = allDestGroups();
    for (var i = 0; i < groups.length; i++) {
      var members = groups[i].members || [];
      if (members.indexOf(a) >= 0 && members.indexOf(b) >= 0) return true;
    }
    return false;
  }

  /** 有公里规则的内置区域；其余分组（超外系、外内系、自建组）公里留白 */
  var KM_GROUP_IDS = ['zone-ab', 'zone-cd', 'zone-ys'];

  /** 内置分组的基准地点：组内没单独登记公里的地点，跟随基准地点的公里 */
  var GROUP_ANCHORS = {
    'zone-ab': ['外一', '外二'],
    'zone-cd': ['外四', '外五'],
    'zone-ys': ['洋山', '沧海路', '洋山（查验）'],
  };

  /** 某内置分组在当前始发地下的基准公里；没有基准返回 null */
  function groupAnchorKm(origin, groupId) {
    var anchors = GROUP_ANCHORS[groupId];
    if (!anchors) return null;
    for (var i = 0; i < anchors.length; i++) {
      var v = lookupBaseKm(origin, anchors[i]);
      if (typeof v === 'number' && v > 0) return v;
    }
    return null;
  }

  /** 该分组是否按「远 10 公里」处理（洋山系 / 超外系） */
  function isFarGroup(group) {
    if (!group) return false;
    return group.id === 'zone-ys' || group.label === '洋山系' ||
      group.id === 'zone-cw' || group.label === '超外系';
  }

  /** 按 id 找分组（进 / 提还两套一起查） */
  function findGroupById(id) {
    var groups = allDestGroups();
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].id === id) return groups[i];
    }
    return null;
  }

  /** 分组设定的公里：新库为基准，东库按 ±10 自动推导（手填过则以手填为准） */
  function groupKmValue(origin, group) {
    if (!group || !group.km) return null;
    var own = Number(group.km[origin]);
    if (isFinite(own) && own > 0) return own;
    var base = Number(group.km['新库']);
    if (!isFinite(base) || base <= 0) return null;
    if (origin === '新库') return base;
    if (origin === '东库') {
      var v = base + (isFarGroup(group) ? 10 : -10);
      return v > 0 ? v : 0;
    }
    return base;
  }

  /** 某段的实际公里：自己登记的（非 0）优先，没填则跟随所在分组的基准地点 */
  function resolveDestKm(origin, dest) {
    var own = lookupBaseKm(origin, dest);
    if (typeof own === 'number' && own > 0) return own;
    var gid = getDestGroupId(dest);
    var group = gid ? findGroupById(gid) : null;
    // 分组自己设了公里（如「新库130」组：新库 130 / 东库自动 120）
    var groupKm = groupKmValue(origin, group);
    if (groupKm !== null) return groupKm;
    // 非内置区域（超外系 / 外内系 / 自建组）没有基准，留空手填
    if (!gid || KM_GROUP_IDS.indexOf(gid) < 0) return null;
    return groupAnchorKm(origin, gid);
  }

  /** 自动算总公里；有目的地没有公里规则时返回 null（表示需要手填） */
  function computeAutoKm(origin, steps) {
    if (!origin || !Array.isArray(steps)) return 0;
    var sum = 0;
    var prevDest = null;
    var unknown = false;
    steps.forEach(function (s) {
      if (!s || !s.dest) return;
      // 跟前一个同区域 → 不算移动车，不加公里
      if (prevDest && sameDestGroup(prevDest, s.dest)) {
        prevDest = s.dest;
        return;
      }
      // 自己没登记公里就跟随所在分组（例如 创元六 在外四外五系 → 按外四/外五算）
      var km = resolveDestKm(origin, s.dest);
      // 没有基准的分组（超外系 / 外内系 / 自建组）→ 留白，交给人手填
      if (km === null) {
        unknown = true;
      } else {
        sum += km;
      }
      prevDest = s.dest;
    });
    return unknown ? null : sum;
  }

  /** 判断目的地属于哪个区域 id */
  function getDestGroupId(dest) {
    var groups = allDestGroups();
    for (var i = 0; i < groups.length; i++) {
      if ((groups[i].members || []).indexOf(dest) >= 0) return groups[i].id;
    }
    return null;
  }

  /** 自动提成计算（基于步骤组合规则） */
  function computeAutoCommission(steps) {
    if (!Array.isArray(steps) || !steps.length) return 0;
    // 过滤掉没选目的地的步骤
    var valid = steps.filter(function (s) { return s && s.dest; });
    if (!valid.length) return 0;
    if (valid.length > 3) return 0; // 一进最多带两提，其他组合暂不存在

    var first = valid[0];
    var firstGroup = getDestGroupId(first.dest); // zone-ab / zone-cd / zone-ys
    // 「还」「落」与「提」提成规则完全一致
    var isPick = function (s) { return s.action === '提' || s.action === '还' || s.action === '落'; };
    var pickHasYangshan = valid.some(function (s, i) {
      return i > 0 && isPick(s) && getDestGroupId(s.dest) === 'zone-ys';
    });

    // 纯进1段
    if (valid.length === 1 && first.action === '进') {
      if (firstGroup === 'zone-ys') return 0;   // 进洋山 = 0
      return 10;                                  // 进外系 = 10
    }
    // 纯提 / 纯还 1段
    if (valid.length === 1 && isPick(first)) {
      if (firstGroup === 'zone-ys') return 100;   // 提（还）洋山 = 100
      return 10;                                  // 提（还）外系 = 10
    }
    // 进 + 提 / 进 + 还（2段）
    if (valid.length === 2 && first.action === '进' && isPick(valid[1])) {
      // 提（还）洋山系 = 100（沧海路同洋山）
      if (getDestGroupId(valid[1].dest) === 'zone-ys') return 100;
      // 进外系 + 提（还）外系 = 30
      if (firstGroup !== 'zone-ys') return 30;
      // 进洋山 + 提外系 → 暂不存在，按 0
      return 0;
    }
    // 一进二提 / 一进还提（3段）：进外系 + 两个外系提 = 60
    if (valid.length === 3 && first.action === '进' && isPick(valid[1]) && isPick(valid[2])) {
      if (pickHasYangshan) return 100;          // 含提洋山，按 100
      if (firstGroup !== 'zone-ys') return 60;  // 一进二提（外）= 60
      return 0;
    }
    return 0;
  }

  /** 由结构化 route 拼出展示名 */
  function buildRouteName(route) {
    if (!route || !Array.isArray(route.steps) || !route.steps.length) return route.origin || '';
    var parts = [route.origin];
    route.steps.forEach(function (s) {
      if (!s) return;
      var label = s.action === '提' ? '提'
        : (s.action === '还' ? '还' : (s.action === '落' ? '落' : '进'));
      parts.push(label + (s.dest || ''));
    });
    return parts.join(' → ');
  }

  /** 检测 route 是否为旧格式（无 steps、有 name） */
  function isOldRoute(route) {
    return route && !Array.isArray(route.steps) && typeof route.name === 'string';
  }

  function loadLocalDb() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultDb();
      var parsed = JSON.parse(raw);
      if (
        !parsed ||
        !Array.isArray(parsed.drivers) ||
        !Array.isArray(parsed.routes) ||
        !Array.isArray(parsed.trips) ||
        !Array.isArray(parsed.fuel)
      ) {
        return defaultDb();
      }
      // 深度合并 configs：保留用户已有值，补齐新增字段
      var def = defaultDb();
      var rawCfg = parsed.configs || {};
      var cfg = Object.assign({}, def.configs, rawCfg);
      if (!cfg.base_km) cfg.base_km = def.configs.base_km;
      // 旧版只有一套 dest_groups（进 + 提还共用）：
      // 迁移时把它整体搬成提还分组，进分组只保留固定的三组
      // 必须看存储原文：合并后的 cfg 会被默认 dest_pick_groups 填上，判断会失效
      if (!Array.isArray(rawCfg.dest_pick_groups)) {
        cfg.dest_pick_groups = Array.isArray(rawCfg.dest_groups) && rawCfg.dest_groups.length
          ? JSON.parse(JSON.stringify(rawCfg.dest_groups))
          : JSON.parse(JSON.stringify(def.configs.dest_pick_groups));
      }
      var builtinInIds = def.configs.dest_groups.map(function (g) { return g.id; });
      var oldGroups = Array.isArray(rawCfg.dest_groups) ? rawCfg.dest_groups : [];
      cfg.dest_groups = builtinInIds.map(function (id, i) {
        var old = oldGroups.filter(function (g) { return g.id === id; })[0];
        var fresh = def.configs.dest_groups[i];
        return {
          id: id,
          label: (old && old.label) || fresh.label,
          desc: (old && old.desc) || fresh.desc,
          members: (old && Array.isArray(old.members)) ? old.members : fresh.members.slice(),
        };
      });
      // 仅在「旧版本升级到有提还分组」时补一次默认内置组（超外系 / 外内系）。
      // 之后用户删掉了就删掉，绝不能在每次加载时再补回来。
      if (!Array.isArray(rawCfg.dest_pick_groups)) {
        def.configs.dest_pick_groups.forEach(function (dg) {
          if (!cfg.dest_pick_groups.some(function (g) { return g.id === dg.id; })) {
            var pos = cfg.dest_pick_groups.map(function (g) { return g.id; }).indexOf('zone-ys');
            if (dg.id === 'zone-cw') pos = 0;
            else if (dg.id === 'zone-wn' && pos < 0) pos = cfg.dest_pick_groups.length;
            cfg.dest_pick_groups.splice(pos < 0 ? cfg.dest_pick_groups.length : pos, 0,
              JSON.parse(JSON.stringify(dg)));
          }
        });
      }
      if (!cfg.coords || typeof cfg.coords !== 'object') cfg.coords = {};
      // 同名分组归并（历史上自建过「超外系」等同名组会残留，导致地图圆点取到兜底色）
      cfg.dest_groups = mergeSameLabelGroups(cfg.dest_groups);
      cfg.dest_pick_groups = mergeSameLabelGroups(cfg.dest_pick_groups);
      // 还原被上一版迁移弄丢的提还分组归属（同时清掉进分组里混入的提还地点）
      restorePickAssignments(cfg);
      // 同一地点只归一个组 + 给分组补固定颜色（顺序怎么变都不影响颜色）
      enforceSingleOwner(cfg);
      ensureGroupColors(cfg);
      // 确保 base_km 里包含所有现有目的地
      Object.keys(cfg.base_km).forEach(function (origin) {
        (cfg.dest_in || []).concat(cfg.dest_pick || []).forEach(function (d) {
          if (cfg.base_km[origin][d] === undefined) cfg.base_km[origin][d] = 0;
        });
      });
      return {
        configs: cfg,
        drivers: parsed.drivers,
        routes: parsed.routes,
        trips: parsed.trips,
        fuel: parsed.fuel,
        attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
      };
    } catch (error) {
      return defaultDb();
    }
  }

  function saveLocalDb() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return true;
    } catch (error) {
      return false;
    }
  }

  /** 启动时加载数据（纯 localStorage） */
  function loadDb() {
    db = loadLocalDb();
    db.routes = db.routes.filter(function (r) { return Array.isArray(r.steps); });
    // 迁移补了分组/公里表时立即写回，避免内存与存储不一致
    saveLocal();
  }

  function newId() {
    var max = 0;
    var groups = [db.drivers, db.routes, db.trips, db.fuel];
    groups.forEach(function (group) {
      group.forEach(function (item) {
        if (Number(item.id) > max) max = Number(item.id);
      });
    });
    return max + 1;
  }

  /** 本地保存（总是执行，作为离线备份） */
  function saveLocal() {
    saveLocalDb();
  }


