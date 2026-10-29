/* ===== pages/map.js ===== */
/* 地图页：结构 + 样式 + 逻辑（含坐标弹窗、右键菜单）都在这个文件里 */
'use strict';

definePage('map', {
  html: `
    <div class="page-head">
      <div>
        <h2>目的地地图</h2>
        <p class="sub">按区域查看所有始发地与目的地。点地点可定位放大；右键地点（或地图上的圆点）可用弹窗精确设置或清除坐标。</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn-ghost" id="mapFitBtn">全览</button>
        <button type="button" class="btn btn-ghost" id="cfgOriginsBtn">管理始发地</button>
        <button type="button" class="btn btn-ghost" id="cfgDestInBtn">管理进港区</button>
        <button type="button" class="btn btn-ghost" id="cfgDestPickBtn">管理提还堆场</button>
      </div>
    </div>

    <div class="map-layout">
      <div class="map-main">
        <div class="map-search" id="mapSearchWrap">
          <input type="text" id="mapSearchInput" placeholder="搜已保存的地点或路名，例如：外一 / 外高桥六期">
          <button type="button" class="btn btn-ghost" id="mapSearchBtn">搜索</button>
          <div class="map-search-list is-hidden" id="mapSearchList"></div>
        </div>
        <div class="map-filters" id="mapFilters"></div>
        <div class="map-canvas" id="mapCanvas"></div>
      </div>
      <aside class="map-side">
        <div class="map-side-head">
          <span>地点列表</span>
          <span class="map-side-count" id="mapSideCount"></span>
        </div>
        <div class="map-side-list" id="mapPlaceList"></div>
      </aside>
    </div>
  `,

  css: `
/* ===== 地图 ===== */
.map-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 14px;
}

.map-main {
  position: relative;
}

.map-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

/* ===== 地点搜索 ===== */
.map-search {
  position: relative;
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.map-search input {
  flex: 1 1 auto;
  min-width: 0;
  height: 34px;
  padding: 0 11px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  color: var(--ink);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.map-search input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(42, 91, 224, 0.12);
}

.map-search .btn {
  height: 34px;
  padding: 0 14px;
  flex: 0 0 auto;
}

.map-search-list {
  position: absolute;
  left: 0;
  right: 0;
  top: 40px;
  z-index: 30;
  max-height: 240px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 9px;
  box-shadow: 0 14px 32px -12px rgba(16, 24, 40, 0.35);
}

.map-search-sec {
  padding: 7px 11px 4px;
  font-size: 11px;
  color: var(--muted);
  background: #fafbfd;
  border-bottom: 1px solid #f1f4f9;
}

.map-search-item {
  padding: 8px 11px;
  border-bottom: 1px solid #f1f4f9;
  font-size: 13px;
  cursor: pointer;
}

.map-search-item:last-child {
  border-bottom: 0;
}

.map-search-item:hover {
  background: #f5f7fb;
}

.map-search-item b {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.map-search-item span {
  display: block;
  margin-top: 1px;
  font-size: 11.5px;
  color: var(--muted);
}

.map-search-empty {
  padding: 10px 11px;
  font-size: 12px;
  color: var(--muted);
}

.map-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  font-size: 12px;
  color: var(--ink-soft);
  cursor: pointer;
  user-select: none;
}

.map-chip input {
  margin: 0;
  cursor: pointer;
}

.map-chip i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.map-chip.is-off {
  opacity: 0.45;
}

.map-canvas {
  position: relative;
  height: 560px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #f4f6fa;
  overflow: hidden;
}

.map-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  line-height: 2;
}

.map-side {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 596px;
}

.map-side-head {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.map-side-count {
  font-weight: 400;
  color: var(--muted);
}

.map-side-list {
  overflow-y: auto;
  padding: 6px;
}

/* 分组折叠 */
.map-group {
  margin-bottom: 4px;
}

.map-group-head {
  display: flex;
  align-items: center;
  border-radius: 7px;
  background: #f6f8fc;
}

.map-group-head:hover {
  background: #eef2f9;
}

.map-group-grip {
  flex: 0 0 auto;
  padding: 0 1px 0 6px;
  color: #b3bfd0;
  font-size: 12px;
  letter-spacing: -1px;
  cursor: grab;
  user-select: none;
}

.map-group-grip:active {
  cursor: grabbing;
}

.map-group-toggle {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 7px 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--ink-soft);
  cursor: pointer;
  text-align: left;
}

.map-group-head i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: 0 0 auto;
}

/* 分组色点：点一下就能改颜色 */
.map-group-head i.map-color-dot {
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.map-group-head i.map-color-dot:hover {
  transform: scale(1.4);
  box-shadow: 0 0 0 3px rgba(42, 91, 224, 0.18);
}

.map-group-name {
  flex: 1 1 auto;
  font-weight: 600;
}

.map-group-head em {
  font-style: normal;
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.map-group-caret {
  font-size: 10px;
  color: #9aa7b8;
  transition: transform 0.15s;
}

.map-group.is-collapsed .map-group-caret {
  transform: rotate(-90deg);
}

.map-group.is-collapsed .map-group-body {
  display: none;
}

.map-group-body {
  padding: 2px 0 4px 10px;
}

.map-place {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 13px;
}

.map-place:hover {
  background: #f5f7fb;
}

.map-place.is-highlight {
  background: #fff2dc;
  box-shadow: inset 4px 0 0 #f59e0b;
  font-weight: 600;
  color: var(--ink);
}

.map-place i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.map-place span {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-place em {
  font-style: normal;
  font-size: 11px;
  color: var(--muted);
}

.map-place em.warn {
  color: var(--warn);
}

/* 拖动换组 / 拖动排序 */
.map-place[draggable="true"] {
  cursor: grab;
}

.map-place.dragging {
  opacity: 0.35;
}

.map-group.is-dragging {
  opacity: 0.45;
}

.map-group.drag-over > .map-group-head {
  background: #e8f0ff;
  box-shadow: inset 0 0 0 1px var(--primary);
}

.map-group.drop-before {
  box-shadow: 0 -2px 0 var(--primary);
}

.map-group.drop-after {
  box-shadow: 0 2px 0 var(--primary);
}

.map-empty {
  padding: 12px 8px;
  font-size: 12px;
  color: var(--muted);
}

.map-menu {
  position: fixed;
  z-index: 60;
  min-width: 156px;
  padding: 5px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 9px;
  box-shadow: 0 14px 32px -12px rgba(16, 24, 40, 0.35);
}

.map-menu button {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
}

.map-menu button:hover {
  background: #f3f6fb;
  color: var(--ink);
}

.map-menu button.danger {
  color: var(--danger);
}

.modal-coord {
  width: 640px;
}

.coord-map {
  position: relative;
  height: 320px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: #f4f6fa;
  margin-bottom: 10px;
  overflow: hidden;
}

.coord-map .map-hint {
  font-size: 12px;
  line-height: 1.9;
}

.coord-value {
  font-size: 12px;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
  `,

  init: function () {
    $('mapFilters').addEventListener('change', function (e) {
      var input = e.target.closest('[data-map-filter]');
      if (!input) return;
      mapState.filter[input.dataset.mapFilter] = input.checked;
      renderMapFilters();
      renderMapPlaceList();
      renderMapMarkers(false);
    });
    $('mapPlaceList').addEventListener('click', function (e) {
      var dot = e.target.closest('[data-group-color]');
      if (dot) {
        e.preventDefault();
        e.stopPropagation();
        if (!requireManager('修改分组颜色')) return;
        openGroupColorPicker(dot.dataset.groupColor, dot);
        return;
      }
      var head = e.target.closest('[data-group-toggle]');
      if (head) {
        var gid = head.dataset.groupToggle;
        mapState.collapsed[gid] = !mapState.collapsed[gid];
        renderMapPlaceList();
        return;
      }
      var row = e.target.closest('[data-map-place]');
      if (!row) return;
      var name = row.dataset.mapPlace;
      var coord = placeCoord(name);
      if (!coord) {
        toast('「' + name + '」还没有坐标，右键选「用弹窗精确设置」');
        return;
      }
      if (mapState.map) mapState.map.setZoomAndCenter(15, [coord.lng, coord.lat]);
      var group = getPlaceGroups().filter(function (g) { return g.names.indexOf(name) >= 0; })[0];
      if (group) openPlaceInfo(name, group);
    });
    $('mapPlaceList').addEventListener('contextmenu', function (e) {
      var row = e.target.closest('[data-map-place]');
      if (!row) return;
      e.preventDefault();
      if (!isManager()) {
        toast('员工模式无法设置坐标', 'error');
        return;
      }
      openMapMenu(row.dataset.mapPlace, e.clientX, e.clientY);
    });

    // 右侧列表拖动：地点换组 / 分组排序（员工只读）
    $('mapPlaceList').addEventListener('dragstart', function (e) {
      if (!isManager()) {
        e.preventDefault();
        return;
      }
      var grip = e.target.closest('.map-group-grip');
      if (grip) {
        var card = grip.closest('[data-map-group]');
        if (!card) return;
        mapDrag = { type: 'group', name: '', groupId: card.dataset.mapGroup };
        card.classList.add('is-dragging');
      } else {
        var row = e.target.closest('[data-map-place]');
        if (!row) return;
        mapDrag = { type: 'place', name: row.dataset.mapPlace, groupId: '' };
        row.classList.add('dragging');
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', mapDrag.name || ('group:' + mapDrag.groupId));
    });
    $('mapPlaceList').addEventListener('dragend', function () {
      mapDrag = { type: '', name: '', groupId: '' };
      clearMapDragMarks();
    });
    $('mapPlaceList').addEventListener('dragover', function (e) {
      if (!mapDrag.type) return;
      var card = e.target.closest('[data-map-group]');
      if (!card) return;
      var gid = card.dataset.mapGroup;
      if (mapDrag.type === 'place' && gid === 'origin') return;
      if (mapDrag.type === 'group' && (gid === mapDrag.groupId || gid === 'origin' || gid === 'ungrouped')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      clearMapDropMarks();
      if (mapDrag.type === 'place') {
        card.classList.add('drag-over');
      } else {
        var rect = card.getBoundingClientRect();
        card.classList.add((e.clientY - rect.top) < rect.height / 2 ? 'drop-before' : 'drop-after');
      }
    });
    $('mapPlaceList').addEventListener('drop', function (e) {
      if (!mapDrag.type) return;
      var card = e.target.closest('[data-map-group]');
      if (!card) return;
      var gid = card.dataset.mapGroup;
      var drag = mapDrag;
      var rect = card.getBoundingClientRect();
      var before = (e.clientY - rect.top) < rect.height / 2;
      e.preventDefault();
      mapDrag = { type: '', name: '', groupId: '' };
      clearMapDragMarks();
      if (drag.type === 'place') {
        if (gid === 'origin') return;
        mapMovePlaceToGroup(drag.name, gid === 'ungrouped' ? '__none__' : gid);
      } else if (gid && gid !== drag.groupId && gid !== 'origin' && gid !== 'ungrouped') {
        mapReorderGroups(drag.groupId, gid, before);
      }
    });

    // 地点搜索
    $('mapSearchBtn').addEventListener('click', runMapSearch);
    $('mapSearchInput').addEventListener('input', updateMapSearchInput);
    $('mapSearchInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); runMapSearch(); }
      if (e.key === 'Escape') $('mapSearchList').classList.add('is-hidden');
    });
    $('mapSearchList').addEventListener('click', function (e) {
      var local = e.target.closest('[data-search-local]');
      if (local) {
        applyLocalSearch(Number(local.dataset.searchLocal));
        return;
      }
      var item = e.target.closest('[data-search-idx]');
      if (item) applySearchOnMain(Number(item.dataset.searchIdx));
    });
    $('coordSearchBtn').addEventListener('click', runCoordSearch);
    $('coordSearchInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); runCoordSearch(); }
    });
    $('coordSearchList').addEventListener('click', function (e) {
      var item = e.target.closest('[data-search-idx]');
      if (item) applySearchInCoord(Number(item.dataset.searchIdx));
    });
    $('mapMenu').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-map-menu]');
      if (!btn) return;
      handleMapMenu(btn.dataset.mapMenu);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#mapMenu')) hideMapMenu();
      if (!e.target.closest('#mapSearchWrap')) $('mapSearchList').classList.add('is-hidden');
      if (!e.target.closest('#coordSearchWrap')) $('coordSearchList').classList.add('is-hidden');
    });
    document.addEventListener('contextmenu', function (e) {
      if (e.target.closest('#mapPlaceList') || e.target.closest('#cfgTags') || e.target.closest('#mapCanvas')) return;
      hideMapMenu();
    });
    window.addEventListener('scroll', hideMapMenu, true);
    $('mapFitBtn').addEventListener('click', function () {
      if (mapState.map) renderMapMarkers(true);
    });
    // 地点管理弹窗（复用线路价目页那套 openCfgModal）
    $('cfgOriginsBtn').addEventListener('click', function () { openCfgModal('origins'); });
    $('cfgDestInBtn').addEventListener('click', function () { openCfgModal('dest_in'); });
    $('cfgDestPickBtn').addEventListener('click', function () { openCfgModal('dest_pick'); });
    $('coordModalClose').addEventListener('click', closeCoordModal);
    $('coordSaveBtn').addEventListener('click', saveCoordModal);
    $('coordClearBtn').addEventListener('click', function () {
      mapState.coordLatLng = null;
      drawCoordMarker();
      updateCoordValue();
    });
    $('coordModal').addEventListener('click', function (e) {
      if (e.target.id === 'coordModal') closeCoordModal();
    });
  },
});

/* ================= 地图 ================= */
var MAP_COLORS = {
  origin: '#111827',
  'zone-ab': '#2563eb',
  'zone-cd': '#f59e0b',
  'zone-ys': '#16a34a',
  ungrouped: '#94a3b8',
};

/** 自定义分组的可选配色（色相均匀，避免蓝青扎堆；按顺序取未被占用的） */
var GROUP_PALETTE = [
  '#ef4444', // 红
  '#fb923c', // 亮橙
  '#84cc16', // 黄绿
  '#22c55e', // 草绿
  '#14b8a6', // 青绿
  '#06b6d4', // 亮青
  '#60a5fa', // 天蓝
  '#a78bfa', // 亮紫
  '#ec4899', // 粉
  '#be123c', // 深红
];

/** 分组的显示颜色：用户自定义色优先；内置组按 id（或标准名称）取固定色；自建组用自己存的 color */
function groupColor(group, idx) {
  if (!group) return MAP_COLORS.ungrouped;
  // 用户在地图页点圆点改过的颜色，优先于一切默认色
  var custom = db && db.configs && db.configs.group_colors && db.configs.group_colors[group.id];
  if (custom) return custom;
  var byId = MAP_COLORS[group.id];
  if (byId) return byId;
  // 历史数据里可能残留 id 随机的同名分组（如用户自建过「外一外二系」），按名称兜底，保证颜色稳定
  var byLabel = MAP_COLORS[BUILTIN_GROUP_IDS[group.label]];
  if (byLabel) return byLabel;
  if (group.color) return group.color;
  // 没存颜色的老分组：按名称哈希取色，与它在列表里的位置无关
  return GROUP_PALETTE[colorHash(group.label || group.id) % GROUP_PALETTE.length];
}

/** 名称 → 稳定的数字（用于按名字固定挑色，避免拖动排序后换色） */
function colorHash(text) {
  var s = String(text == null ? '' : text);
  var h = 0;
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}

/** 给所有分组补上固定颜色并写回数据（老数据 color 为空时补一次，之后就永远不变） */
function ensureGroupColors(cfgIn) {
  var cfg = cfgIn || (db && db.configs);
  if (!cfg) return false;
  var changed = false;
  var lists = [cfg.dest_pick_groups || [], cfg.dest_groups || []];
  // 已占用的颜色（内置组 + 已明确指定颜色的组）先登记
  var used = [];
  lists.forEach(function (list) {
    list.forEach(function (g) {
      var c = groupColor(g, 0);
      if (c && used.indexOf(c) < 0 && (g.color || MAP_COLORS[g.id] || MAP_COLORS[BUILTIN_GROUP_IDS[g.label]])) {
        used.push(c);
      }
    });
  });
  lists.forEach(function (list) {
    list.forEach(function (g) {
      var fixed = MAP_COLORS[g.id] || MAP_COLORS[BUILTIN_GROUP_IDS[g.label]];
      if (fixed) {
        if (g.color !== fixed) { g.color = fixed; changed = true; }
        return;
      }
      if (g.color) return;
      // 自建组：按名称哈希挑一个没被占用的颜色，稳定且不会和内置组撞色
      var start = colorHash(g.label || g.id) % GROUP_PALETTE.length;
      var pick = '';
      for (var k = 0; k < GROUP_PALETTE.length; k++) {
        var cand = GROUP_PALETTE[(start + k) % GROUP_PALETTE.length];
        if (used.indexOf(cand) < 0) { pick = cand; break; }
      }
      if (!pick) pick = GROUP_PALETTE[start];
      g.color = pick;
      used.push(pick);
      changed = true;
    });
  });
  return changed;
}

/** 同一地点只允许归一个组：跨「进 / 提还」两套一起去重，避免同一地点画两个点、颜色互相覆盖 */
function enforceSingleOwner(cfgIn) {
  var cfg = cfgIn || (db && db.configs);
  if (!cfg) return;
  var inSet = {};
  (cfg.dest_in || []).forEach(function (n) { inSet[n] = true; });
  var pickSet = {};
  (cfg.dest_pick || []).forEach(function (n) { pickSet[n] = true; });
  // 进目的地：只看进分组
  var seenIn = {};
  (cfg.dest_groups || []).forEach(function (g) {
    g.members = (g.members || []).filter(function (m) {
      if (!m || !inSet[m] || seenIn[m]) return false;
      seenIn[m] = true;
      return true;
    });
  });
  // 提还目的地：先按组顺序去重，再把进分组里混入的提还专属地点清掉
  var seenPick = {};
  (cfg.dest_pick_groups || []).forEach(function (g) {
    g.members = (g.members || []).filter(function (m) {
      if (!m || seenPick[m]) return false;
      seenPick[m] = true;
      return true;
    });
  });
  (cfg.dest_groups || []).forEach(function (g) {
    g.members = (g.members || []).filter(function (m) {
      return !(pickSet[m] && !inSet[m]);
    });
  });
}

function pickGroupColor() {
  var used = allDestGroups().map(function (g, i) { return groupColor(g, i); });
  for (var i = 0; i < GROUP_PALETTE.length; i++) {
    if (used.indexOf(GROUP_PALETTE[i]) < 0) return GROUP_PALETTE[i];
  }
  return GROUP_PALETTE[used.length % GROUP_PALETTE.length];
}

var mapState = {
  map: null,
  markers: [],
  loading: false,
  queue: [],
  filter: {},
  collapsed: {},
  highlight: '',
  coordMap: null,
  coordMarker: null,
  coordTarget: '',
  coordLatLng: null,
  info: null,
  menuName: '',
};

function amapConfigured() {
  return !!AMAP_KEY && AMAP_KEY.indexOf('YOUR-AMAP') < 0;
}

function loadAMapApi(done, fail) {
  if (window.AMap) { done(); return; }
  if (!amapConfigured()) { if (fail) fail('nokey'); return; }
  mapState.queue.push({ done: done, fail: fail });
  if (mapState.loading || document.getElementById('amapScript')) return;
  mapState.loading = true;
  if (AMAP_SECURITY_CODE && AMAP_SECURITY_CODE.indexOf('YOUR-AMAP') < 0) {
    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
  }
  var script = document.createElement('script');
  script.id = 'amapScript';
  script.async = true;
  script.src = 'https://webapi.amap.com/maps?v=2.0&key=' + encodeURIComponent(AMAP_KEY);
  script.onload = function () { mapState.loading = false; flushAmapQueue(true); };
  script.onerror = function () { mapState.loading = false; flushAmapQueue(false); };
  document.head.appendChild(script);
}

function flushAmapQueue(ok) {
  var queue = mapState.queue;
  mapState.queue = [];
  queue.forEach(function (item) {
    if (ok) item.done();
    else if (item.fail) item.fail('loadfail');
  });
}

function placeCoord(name) {
  var coords = (db.configs && db.configs.coords) || {};
  var c = coords[name];
  if (!c || typeof c.lat !== 'number' || typeof c.lng !== 'number') return null;
  return c;
}

function round6(value) {
  return Math.round(Number(value) * 1e6) / 1e6;
}

/** 地点按区域归组：[{id,label,color,names}] */
function getPlaceGroups() {
  var cfg = db.configs;
  var out = [];
  out.push({ id: 'origin', label: '始发地', color: groupColor({ id: 'origin', label: '始发地' }), names: (cfg.origins || []).slice() });

  var dests = [];
  (cfg.dest_in || []).forEach(function (n) { if (dests.indexOf(n) < 0) dests.push(n); });
  (cfg.dest_pick || []).forEach(function (n) { if (dests.indexOf(n) < 0) dests.push(n); });

  // 地图分组 = 提还分组 + 进分组（同 id 合并），提还分组排在前面
  var merged = [];
  var seenId = {};
  (cfg.dest_pick_groups || []).concat(cfg.dest_groups || []).forEach(function (g) {
    if (seenId[g.id]) {
      // 同一内置组（外一外二系等）在两套分组里都存在，成员合并
      var exist = merged.filter(function (m) { return m.id === g.id; })[0];
      (g.members || []).forEach(function (m) {
        if ((exist.members || []).indexOf(m) < 0) exist.members.push(m);
      });
      return;
    }
    seenId[g.id] = true;
    merged.push({ id: g.id, label: g.label, members: (g.members || []).slice(), color: g.color });
  });

  var assigned = {};
  merged.forEach(function (g, gi) {
    // 同一地点若同时存在于多个分组，只归入排在前面的那个分组，避免重复画点、颜色打架
    var names = dests.filter(function (n) {
      return !assigned[n] && (g.members || []).indexOf(n) >= 0;
    });
    names.forEach(function (n) { assigned[n] = true; });
    // 空分组也显示，保持与目的地管理同步
    out.push({ id: g.id, label: g.label, color: groupColor(g, gi), names: sortNamesByName(names) });
  });
  var rest = dests.filter(function (n) { return !assigned[n]; });
  if (rest.length) out.push({ id: 'ungrouped', label: '未分组', color: groupColor({ id: 'ungrouped', label: '未分组' }), names: rest });
  return out;
}

/** 只同步地点相关配置（分组、坐标、名称表），不动司机/趟次等数据 */
function syncConfigsFromStorage() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    var cfg = parsed && parsed.configs;
    if (!cfg) return;
    if (Array.isArray(cfg.dest_groups) && cfg.dest_groups.length) {
      db.configs.dest_groups = cfg.dest_groups;
    }
    if (Array.isArray(cfg.dest_pick_groups) && cfg.dest_pick_groups.length) {
      db.configs.dest_pick_groups = cfg.dest_pick_groups;
    }
    if (cfg.coords && typeof cfg.coords === 'object') db.configs.coords = cfg.coords;
    if (Array.isArray(cfg.dest_in)) db.configs.dest_in = cfg.dest_in;
    if (Array.isArray(cfg.dest_pick)) db.configs.dest_pick = cfg.dest_pick;
    if (Array.isArray(cfg.origins)) db.configs.origins = cfg.origins;
    if (cfg.group_colors && typeof cfg.group_colors === 'object') db.configs.group_colors = cfg.group_colors;
    // 从存储同步后再做一次归一（防止旧标签页写回的脏数据）
    enforceSingleOwner();
    ensureGroupColors();
  } catch (e) { /* 解析失败就沿用内存数据 */ }
}

function renderMapPage() {
  // 从存储同步一次地点配置，避免另一个标签页改过分组后这里仍用旧数据
  syncConfigsFromStorage();
  mapState.collapsed = {};
  mapState.highlight = '';
  getPlaceGroups().forEach(function (g) { mapState.collapsed[g.id] = true; });
  renderMapFilters();
  renderMapPlaceList();

  if (!amapConfigured()) {
    $('mapCanvas').innerHTML =
      '<div class="map-hint"><div>地图需要高德 Key<br>' +
      '1. 打开 <b>console.amap.com</b> 申请「Web端（JS API）」Key<br>' +
      '2. 把 Key 和安全密钥填入 HTML 里 <b>AMAP_KEY</b> 与 <b>AMAP_SECURITY_CODE</b> 两行<br>' +
      '3. 刷新网页即可</div></div>';
    return;
  }
  loadAMapApi(initMainMap, function (reason) {
    $('mapCanvas').innerHTML = '<div class="map-hint"><div>' + (reason === 'nokey'
      ? '未配置高德 Key'
      : '地图加载失败。若已在高德控制台设置了域名白名单：<br>' +
        '双击打开的 file:// 页面没有域名，会被拒绝。<br>' +
        '解决办法：把 <b>localhost</b> 和 <b>127.0.0.1</b> 也加进白名单，<br>' +
        '再用 http://localhost 打开；或直接使用 GitHub Pages 地址。') + '</div></div>';
  });
}

function renderMapFilters() {
  var html = '';
  getPlaceGroups().forEach(function (group) {
    if (mapState.filter[group.id] === undefined) mapState.filter[group.id] = true;
    html += '<label class="map-chip' + (mapState.filter[group.id] ? '' : ' is-off') + '">' +
      '<input type="checkbox" data-map-filter="' + esc(group.id) + '"' +
      (mapState.filter[group.id] ? ' checked' : '') + '>' +
      '<i style="background:' + group.color + '"></i>' + esc(group.label) + '</label>';
  });
  $('mapFilters').innerHTML = html;
}

/** 点击分组圆点 → 打开系统取色盘，选完立即写库并刷新列表、筛选条、地图圆点 */
function openGroupColorPicker(groupId, anchor) {
  if (!requireManager('修改分组颜色')) return;
  var group = getPlaceGroups().filter(function (g) { return String(g.id) === String(groupId); })[0];
  var current = group ? String(group.color || '') : '';
  var input = document.createElement('input');
  input.type = 'color';
  input.value = /^#[0-9a-fA-F]{6}$/.test(current) ? current : '#94a3b8';
  var rect = anchor.getBoundingClientRect();
  input.style.cssText = 'position:fixed;left:' + Math.round(rect.left) + 'px;top:' +
    Math.round(rect.bottom + 6) + 'px;width:1px;height:1px;opacity:0;border:0;padding:0;' +
    'pointer-events:none;';
  document.body.appendChild(input);

  var closed = false;
  function close() {
    if (closed) return;
    closed = true;
    if (input.parentNode) input.parentNode.removeChild(input);
  }
  function store(hex) {
    if (!db.configs.group_colors) db.configs.group_colors = {};
    db.configs.group_colors[groupId] = hex;
  }
  /** 拖取色盘时的即时预览：只改现有色点，不重建列表/地图 */
  function preview(hex) {
    var dots = $('mapPlaceList').querySelectorAll('[data-group-color]');
    for (var i = 0; i < dots.length; i++) {
      if (dots[i].dataset.groupColor === groupId) dots[i].style.background = hex;
    }
    var chips = $('mapFilters').querySelectorAll('[data-map-filter]');
    for (var j = 0; j < chips.length; j++) {
      if (chips[j].dataset.mapFilter !== groupId) continue;
      var chipDot = chips[j].parentNode.querySelector('i');
      if (chipDot) chipDot.style.background = hex;
    }
  }
  input.addEventListener('input', function () {
    store(input.value);
    preview(input.value);
  });
  input.addEventListener('change', function () {
    store(input.value);
    saveLocal();
    renderMapFilters();
    renderMapPlaceList();
    if (mapState.map) renderMapMarkers(false);
    setTimeout(close, 0);
  });
  input.addEventListener('blur', function () { setTimeout(close, 300); });
  input.click();
}

function renderMapPlaceList() {
  var groups = getPlaceGroups();
  var html = '';
  var missing = 0;
  var total = 0;
  // 能在提还分组里重排的分组（始发地、未分组不算）
  var pickIds = {};
  (db.configs.dest_pick_groups || []).forEach(function (g) { pickIds[g.id] = true; });
  groups.forEach(function (group) {
    if (!mapState.filter[group.id]) return;
    var isOrigin = group.id === 'origin';
    var canReorder = !isOrigin && group.id !== 'ungrouped' && !!pickIds[group.id];
    var ok = 0;
    var rows = '';
    sortNamesByName(group.names).forEach(function (name) {
      total++;
      var has = !!placeCoord(name);
      if (has) ok++; else missing++;
      rows += '<div class="map-place' +
        (mapState.highlight === name ? ' is-highlight' : '') +
        '" data-map-place="' + esc(name) + '"' +
        (isOrigin ? '' : ' draggable="true"') + '>' +
        '<span>' + esc(name) + '</span>' +
        (has ? '' : '<em class="warn">未标注</em>') +
        '</div>';
    });
    var collapsed = !!mapState.collapsed[group.id];
    html += '<div class="map-group' + (collapsed ? ' is-collapsed' : '') +
      '" data-map-group="' + esc(group.id) + '">' +
      '<div class="map-group-head">' +
      (canReorder ? '<span class="map-group-grip" draggable="true" title="拖动调整分组顺序">⠿</span>' : '') +
      '<button type="button" class="map-group-toggle" data-group-toggle="' + esc(group.id) + '">' +
      '<i class="map-color-dot" data-group-color="' + esc(group.id) + '" style="background:' + group.color +
        '" title="点击修改分组颜色"></i>' +
      '<span class="map-group-name">' + esc(group.label) + '</span>' +
      '<em>' + ok + '/' + group.names.length + '</em>' +
      '<b class="map-group-caret">▾</b>' +
      '</button>' +
      '</div>' +
      '<div class="map-group-body">' + rows + '</div>' +
      '</div>';
  });
  if (!html) html = '<div class="map-empty">没有可显示的地点</div>';
  $('mapPlaceList').innerHTML = html;
  $('mapSideCount').textContent = total ? (total - missing) + '/' + total + ' 已标注' : '';
}

/* ---- 地图页拖动：地点换组 / 分组排序（都写进提还分组，与管理弹窗同步） ---- */

var mapDrag = { type: '', name: '', groupId: '' };

function clearMapDropMarks() {
  document.querySelectorAll('#mapPlaceList .drag-over, #mapPlaceList .drop-before, #mapPlaceList .drop-after')
    .forEach(function (el) { el.classList.remove('drag-over', 'drop-before', 'drop-after'); });
}

function clearMapDragMarks() {
  document.querySelectorAll('#mapPlaceList .dragging, #mapPlaceList .is-dragging')
    .forEach(function (el) { el.classList.remove('dragging', 'is-dragging'); });
  clearMapDropMarks();
}

/** 拖动后的统一收尾：落盘 + 重绘筛选条 / 地点列表 / 地图圆点 */
function afterMapGroupChange(targetGroupId) {
  // 先保证数据里没有跨组重复、每个分组都有固定颜色，再重绘
  enforceSingleOwner();
  ensureGroupColors();
  saveLocal();
  if (targetGroupId) mapState.collapsed[targetGroupId] = false;
  renderMapFilters();
  renderMapPlaceList();
  renderMapMarkers(false);
  if (cfgModalKey) renderCfgTags();
}

/** 把地点拖到提还分组；targetGroupId 为 '__none__' 表示移到未分组 */
function mapMovePlaceToGroup(name, targetGroupId) {
  if (!requireManager('调整分组')) return;
  if (!name) return;
  if ((db.configs.dest_pick || []).indexOf(name) < 0) {
    toast('「' + name + '」只在进目的地里，不能拖到提还分组', 'error');
    return;
  }
  var groups = db.configs.dest_pick_groups || [];
  var target = null;
  if (targetGroupId !== '__none__') {
    target = groups.filter(function (g) { return g.id === targetGroupId; })[0];
    if (!target) { toast('目标分组不存在', 'error'); return; }
  }
  groups.forEach(function (g) {
    g.members = (g.members || []).filter(function (m) { return m !== name; });
  });
  // 进分组里若残留同名地点一并清掉（仅限非进目的地，避免影响公里判断）
  if ((db.configs.dest_in || []).indexOf(name) < 0) {
    (db.configs.dest_groups || []).forEach(function (g) {
      g.members = (g.members || []).filter(function (m) { return m !== name; });
    });
  }
  if (target) {
    target.members = target.members || [];
    target.members.push(name);
  }
  afterMapGroupChange(targetGroupId === '__none__' ? '' : targetGroupId);
  toast(target ? '「' + name + '」已移入「' + target.label + '」' : '「' + name + '」已移到未分组');
}

/** 拖动分组调整顺序：把 dragId 插到 targetId 前面（before=true）或后面 */
function mapReorderGroups(dragId, targetId, before) {
  if (!requireManager('调整分组顺序')) return;
  if (!dragId || !targetId || dragId === targetId) return;
  var groups = db.configs.dest_pick_groups || [];
  var from = -1;
  groups.forEach(function (g, i) { if (g.id === dragId) from = i; });
  if (from < 0) return;
  var moved = groups.splice(from, 1)[0];
  var to = -1;
  groups.forEach(function (g, i) { if (g.id === targetId) to = i; });
  if (to < 0) { groups.splice(from, 0, moved); return; }
  groups.splice(before ? to : to + 1, 0, moved);
  afterMapGroupChange('');
}

/** 限制地图只能在上海市域范围内平移（含洋山港） */
function setShanghaiLimit(map) {
  if (!map || typeof map.setLimitBounds !== 'function' || !window.AMap || !AMap.Bounds) return;
  map.setLimitBounds(new AMap.Bounds([120.8, 30.5], [122.25, 31.9]));
}

function initMainMap() {
  if (!mapState.map) {
    $('mapCanvas').innerHTML = '';
    try {
      mapState.map = new AMap.Map('mapCanvas', {
        zoom: 11,
        zooms: [10, 18],
        center: [121.72, 30.88],
        viewMode: '2D',
        resizeEnable: true,
      });
    } catch (err) {
      mapState.map = null;
      $('mapCanvas').innerHTML = '<div class="map-hint"><div>地图初始化失败：' +
        esc((err && err.message) || err) +
        '<br>若设置了域名白名单，请把 <b>localhost</b> / <b>127.0.0.1</b> 加进白名单，并用 http://localhost 打开。</div></div>';
      return;
    }
    setShanghaiLimit(mapState.map);
  } else {
    mapState.map.resize();
  }
  renderMapMarkers(true);
}

function renderMapMarkers(fit) {
  var map = mapState.map;
  if (!map) return;
  // 彻底清掉上一次的所有覆盖物，避免旧颜色的圆点残留叠加
  if (mapState.info) { try { mapState.info.close(); } catch (e) { /* 忽略 */ } mapState.info = null; }
  try { map.clearMap(); } catch (e) { /* 忽略 */ }
  mapState.markers = [];

  getPlaceGroups().forEach(function (group) {
    if (mapState.filter[group.id] === false) return;
    group.names.forEach(function (name) {
      var coord = placeCoord(name);
      if (!coord) return;
      var marker = new AMap.CircleMarker({
        center: [coord.lng, coord.lat],
        radius: 5,
        strokeColor: '#fff',
        strokeWeight: 1.5,
        fillColor: group.color,
        fillOpacity: 1,
        cursor: 'pointer',
        zIndex: 10,
      });
      marker.on('click', function () { openPlaceInfo(name, group); });
      marker.on('rightclick', function (event) {
        if (!isManager()) {
          toast('员工模式无法设置坐标', 'error');
          return;
        }
        var oe = event && event.originEvent;
        openMapMenu(name,
          oe && oe.clientX ? oe.clientX : window.innerWidth / 2,
          oe && oe.clientY ? oe.clientY : window.innerHeight / 2);
      });
      map.add(marker);
      mapState.markers.push(marker);
    });
  });

  if (fit && mapState.markers.length) {
    map.setFitView(mapState.markers, false, [70, 70, 70, 70]);
  }
}

function openPlaceInfo(name, group) {
  var coord = placeCoord(name);
  if (!coord || !mapState.map) return;
  var html = '<div style="padding:4px 8px;font-size:12px;line-height:1.8">' +
    '<b>' + esc(name) + '</b><br>' +
    '<span style="color:#667085">' + esc(group.label) + '</span></div>';
  if (mapState.info) mapState.info.close();
  mapState.info = new AMap.InfoWindow({
    content: html,
    offset: new AMap.Pixel(0, -10),
    isCustom: false,
  });
  mapState.info.open(mapState.map, [coord.lng, coord.lat]);
}

/** 展开所在分组、高亮并滚动到该地点 */
function focusPlaceInList(name) {
  var group = getPlaceGroups().filter(function (g) { return g.names.indexOf(name) >= 0; })[0];
  if (group) mapState.collapsed[group.id] = false;
  mapState.highlight = name;
  renderMapPlaceList();
  var row = document.querySelector('[data-map-place="' + name + '"]');
  if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
}

/** 高德 POI 搜索，回调 [{name,address,lng,lat}] */
function searchPoi(keyword, done) {
  keyword = String(keyword || '').trim();
  if (!keyword) return;
  if (!amapConfigured()) {
    toast('未配置高德 Key，无法搜索', 'error');
    return;
  }
  loadAMapApi(function () {
    AMap.plugin('AMap.PlaceSearch', function () {
      var search = new AMap.PlaceSearch({ city: '上海', citylimit: false, pageSize: 8 });
      search.search(keyword, function (status, result) {
        var pois = (status === 'complete' && result && result.poiList && result.poiList.pois) || [];
        done(pois.filter(function (p) { return p.location; }).map(function (p) {
          return {
            name: p.name,
            address: [p.pname, p.cityname, p.adname, p.address].filter(Boolean).join(' '),
            lng: p.location.getLng(),
            lat: p.location.getLat(),
          };
        }));
      });
    });
  }, function () { toast('地图未加载，无法搜索', 'error'); });
}

function renderSearchList(listEl, pois) {
  listEl._pois = pois || [];
  if (!pois || !pois.length) {
    listEl.innerHTML = '<div class="map-search-empty">没找到，换个关键词试试（例如「外高桥」「洋山深水港」）</div>';
  } else {
    listEl.innerHTML = pois.map(function (p, i) {
      return '<div class="map-search-item" data-search-idx="' + i + '">' +
        '<b>' + esc(p.name) + '</b><span>' + esc(p.address) + '</span></div>';
    }).join('');
  }
  listEl.classList.remove('is-hidden');
}

/** 在已保存的始发地/目的地里按名称匹配 */
function searchLocalPlaces(keyword) {
  var kw = String(keyword || '').trim().toLowerCase();
  var out = [];
  if (!kw) return out;
  getPlaceGroups().forEach(function (group) {
    sortNamesByName(group.names).forEach(function (name) {
      if (name.toLowerCase().indexOf(kw) < 0) return;
      out.push({
        name: name,
        groupId: group.id,
        groupLabel: group.label,
        coord: placeCoord(name),
      });
    });
  });
  return out;
}

/** 主地图搜索结果：我的地点 + 地图上的位置 */
function renderMapSearchResults(local, pois) {
  var listEl = $('mapSearchList');
  listEl._local = local || [];
  listEl._pois = pois || [];
  var html = '';
  if (listEl._local.length) {
    html += '<div class="map-search-sec">我的地点</div>';
    listEl._local.forEach(function (item, i) {
      html += '<div class="map-search-item" data-search-local="' + i + '">' +
        '<b>' + esc(item.name) + '</b>' +
        '<span>' + esc(item.groupLabel) + ' · ' + (item.coord ? '已标注' : '未标注') + '</span></div>';
    });
  }
  if (listEl._pois.length) {
    html += '<div class="map-search-sec">地图上的位置</div>';
    listEl._pois.forEach(function (p, i) {
      html += '<div class="map-search-item" data-search-idx="' + i + '">' +
        '<b>' + esc(p.name) + '</b><span>' + esc(p.address) + '</span></div>';
    });
  }
  if (!html) html = '<div class="map-search-empty">没找到，换个关键词试试</div>';
  listEl.innerHTML = html;
  listEl.classList.remove('is-hidden');
}

/** 输入时就地过滤本地地点，不请求高德 */
function updateMapSearchInput() {
  var kw = $('mapSearchInput').value;
  if (!String(kw).trim()) {
    $('mapSearchList').classList.add('is-hidden');
    return;
  }
  renderMapSearchResults(searchLocalPlaces(kw), []);
}

/** 主地图搜索 */
function runMapSearch() {
  var kw = $('mapSearchInput').value;
  if (!String(kw).trim()) return;
  var local = searchLocalPlaces(kw);
  renderMapSearchResults(local, []);
  searchPoi(kw, function (pois) {
    renderMapSearchResults(local, pois);
  });
}

/** 选中「我的地点」：有坐标就定位，没有则提示用右键弹窗设置 */
function applyLocalSearch(idx) {
  var listEl = $('mapSearchList');
  var item = (listEl._local || [])[idx];
  if (!item) return;
  listEl.classList.add('is-hidden');
  if (!item.coord) {
    toast('「' + item.name + '」还没有坐标，右键选「用弹窗精确设置」');
    focusPlaceInList(item.name);
    return;
  }
  if (mapState.map) mapState.map.setZoomAndCenter(15, [item.coord.lng, item.coord.lat]);
  openPlaceInfo(item.name, { label: item.groupLabel });
  focusPlaceInList(item.name);
}

function applySearchOnMain(idx) {
  var listEl = $('mapSearchList');
  var poi = (listEl._pois || [])[idx];
  if (!poi) return;
  listEl.classList.add('is-hidden');
  if (mapState.map) mapState.map.setZoomAndCenter(15, [poi.lng, poi.lat]);
}

/** 坐标弹窗里的搜索 */
function runCoordSearch() {
  searchPoi($('coordSearchInput').value, function (pois) {
    renderSearchList($('coordSearchList'), pois);
  });
}

function applySearchInCoord(idx) {
  var listEl = $('coordSearchList');
  var poi = (listEl._pois || [])[idx];
  if (!poi) return;
  listEl.classList.add('is-hidden');
  mapState.coordLatLng = { lat: round6(poi.lat), lng: round6(poi.lng) };
  if (mapState.coordMap) mapState.coordMap.setZoomAndCenter(16, [poi.lng, poi.lat]);
  drawCoordMarker();
  updateCoordValue();
}

/** 右键菜单：地点列表 / 目的地标签上右键弹出 */
function openMapMenu(name, x, y) {
  mapState.menuName = name;
  var menu = $('mapMenu');
  var clearBtn = menu.querySelector('[data-map-menu="clear"]');
  clearBtn.classList.toggle('is-hidden', !placeCoord(name));
  menu.classList.remove('is-hidden');
  var left = Math.max(8, Math.min(x, window.innerWidth - menu.offsetWidth - 8));
  var top = Math.max(8, Math.min(y, window.innerHeight - menu.offsetHeight - 8));
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
}

function hideMapMenu() {
  mapState.menuName = '';
  $('mapMenu').classList.add('is-hidden');
}

function handleMapMenu(action) {
  var name = mapState.menuName;
  hideMapMenu();
  if (!name) return;
  if (!requireManager('修改坐标')) return;
  if (action === 'clear') {
    if (db.configs.coords) delete db.configs.coords[name];
    saveLocal();
    renderMapPlaceList();
    renderMapMarkers(false);
    if (cfgModalKey) renderCfgTags();
    toast('已清除「' + name + '」坐标');
    return;
  }
  if (action === 'modal') openCoordModal(name);
}

function openCoordModal(name) {
  if (!requireManager('修改坐标')) return;
  mapState.coordTarget = name;
  mapState.coordLatLng = placeCoord(name);
  $('coordModalTitle').textContent = '设置坐标 · ' + name;
  $('coordModal').classList.remove('is-hidden');
  $('coordSearchList').classList.add('is-hidden');
  $('coordSearchInput').value = '';
  updateCoordValue();
  loadAMapApi(initCoordMap, function () {
    $('coordMap').innerHTML = '<div class="map-hint"><div>未配置高德 Key，暂时无法用地图取点<br>请先填写 AMAP_KEY 后刷新网页</div></div>';
  });
}

function initCoordMap() {
  var existing = placeCoord(mapState.coordTarget);
  if (!mapState.coordMap) {
    $('coordMap').innerHTML = '';
    mapState.coordMap = new AMap.Map('coordMap', {
      zoom: existing ? 14 : 12,
      zooms: [11, 18],
      center: existing ? [existing.lng, existing.lat] : [121.72, 30.88],
      resizeEnable: true,
    });
    setShanghaiLimit(mapState.coordMap);
    mapState.coordMap.on('click', function (event) {
      mapState.coordLatLng = {
        lat: round6(event.lnglat.getLat()),
        lng: round6(event.lnglat.getLng()),
      };
      drawCoordMarker();
      updateCoordValue();
    });
  } else {
    mapState.coordMap.resize();
    if (mapState.coordLatLng) {
      mapState.coordMap.setZoomAndCenter(14, [mapState.coordLatLng.lng, mapState.coordLatLng.lat]);
    }
  }
  drawCoordMarker();
}

function drawCoordMarker() {
  var map = mapState.coordMap;
  if (!map) return;
  if (mapState.coordMarker) {
    map.remove(mapState.coordMarker);
    mapState.coordMarker = null;
  }
  if (!mapState.coordLatLng) return;
  var marker = new AMap.CircleMarker({
    center: [mapState.coordLatLng.lng, mapState.coordLatLng.lat],
    radius: 8,
    strokeColor: '#fff',
    strokeWeight: 2,
    fillColor: '#2563eb',
    fillOpacity: 1,
    zIndex: 12,
  });
  map.add(marker);
  mapState.coordMarker = marker;
}

function updateCoordValue() {
  $('coordValue').textContent = mapState.coordLatLng
    ? '纬度 ' + mapState.coordLatLng.lat + ' ，经度 ' + mapState.coordLatLng.lng
    : '尚未选择位置（在地图上点击即可）';
}

function closeCoordModal() {
  $('coordModal').classList.add('is-hidden');
  mapState.coordTarget = '';
  mapState.coordLatLng = null;
}

function saveCoordModal() {
  if (!requireManager('修改坐标')) return;
  if (!mapState.coordTarget) return;
  var name = mapState.coordTarget;
  db.configs.coords = db.configs.coords || {};
  if (mapState.coordLatLng) {
    db.configs.coords[name] = {
      lat: round6(mapState.coordLatLng.lat),
      lng: round6(mapState.coordLatLng.lng),
    };
  } else {
    delete db.configs.coords[name];
  }
  saveLocal();
  if (cfgModalKey) renderCfgTags();
  renderMapPlaceList();
  renderMapMarkers(false);
  closeCoordModal();
  toast('「' + name + '」坐标已保存');
}

