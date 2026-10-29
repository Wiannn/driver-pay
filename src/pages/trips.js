/* ===== pages/trips.js ===== */
/* 趟次录入页：结构 + 样式 + 逻辑（含分页、行内编辑）都在这个文件里 */
'use strict';

definePage('trips', {
  html: `
    <div class="page-head">
      <div>
        <h2>趟次录入</h2>
        <p class="sub">选一个常用路线模板（自动带公里提成），或现场临时搭建（不污染路线库）。</p>
      </div>
      <div class="page-tools"></div>
    </div>

    <form class="entry-card" id="tripForm">
      <div class="field">
        <label for="tripDate">日期</label>
        <input type="date" id="tripDate" required>
      </div>
      <div class="field">
        <label for="tripDriver">司机</label>
        <select id="tripDriver" required></select>
      </div>

      <!-- 路线：直接搭建（从始发地 + 多段步骤） -->
      <div class="field field-wide">
        <label>路线</label>
        <div class="field-inline" style="margin-bottom:8px">
          <select id="tripBuildOrigin"></select>
          <button type="button" class="btn btn-ghost" id="tripBuildAddStep">+ 添加步骤</button>
        </div>
        <div id="tripBuildSteps"></div>
      </div>

      <div class="field">
        <label for="tripKm">公里数</label>
        <input type="number" id="tripKm" step="0.1" min="0" placeholder="0.0" required>
      </div>
      <div class="field">
        <label for="tripCommission">提成（元）</label>
        <input type="number" id="tripCommission" step="0.01" min="0" placeholder="0.00" required>
      </div>
      <div class="field field-submit">
        <button type="submit" class="btn btn-primary">保存趟次</button>
      </div>
    </form>

    <div class="table-card">
      <div class="table-head">
        <h3>本月趟次记录</h3>
        <span class="table-sum" id="tripSummary"></span>
      </div>
      <div class="table-scroll">
        <table class="data-table trip-table">
          <colgroup>
            <col><col><col><col><col><col><col><col><col><col>
          </colgroup>
          <thead>
            <tr>
              <th>日期</th>
              <th>司机</th>
              <th>线路</th>
              <th>箱号 / 提单号</th>
              <th class="num">公里数</th>
              <th class="num">提成</th>
              <th>备注</th>
              <th>更新人</th>
              <th>更新时间</th>
              <th class="op"></th>
            </tr>
          </thead>
          <tbody id="tripRows"></tbody>
        </table>
      </div>
      <div class="pager" id="tripPager" hidden>
        <span class="pager-total" id="tripPagerTotal"></span>
        <button type="button" class="pager-btn" id="tripPrevBtn">‹ 上一页</button>
        <span class="pager-info" id="tripPagerInfo"></span>
        <button type="button" class="pager-btn" id="tripNextBtn">下一页 ›</button>
        <span class="pager-jump">跳至 <input type="text" class="pager-jump-input" id="tripPagerJump" inputmode="numeric"> 页</span>
        <button type="button" class="pager-btn" id="tripPagerJumpBtn">跳转</button>
      </div>
    </div>
  `,

  css: `
/* ---------- 趟次表格：行内可编辑单元格 ---------- */
.data-table .container-no {
  color: var(--primary);
  cursor: text;
  min-width: 140px;
  font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace;
  font-size: 12px;
}

.data-table .container-no:empty::before {
  content: '—';
  color: #ccc;
  font-family: inherit;
  font-size: inherit;
}

.data-table .container-no .container-chip {
  display: inline-block;
  padding: 1px 6px;
  margin: 0 3px 3px 0;
  border-radius: 3px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--primary);
  font-family: inherit;
  font-size: 11px;
  line-height: 1.6;
  white-space: nowrap;
}

.data-table .container-no input.inline-edit {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--primary);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: inherit;
  font-size: inherit;
  color: var(--ink);
  outline: none;
  background: #fff;
}

.data-table .trip-note {
  color: var(--ink);
  cursor: text;
  min-width: 120px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-table .trip-note:empty::before {
  content: '—';
  color: #ccc;
}

.data-table .trip-note input.inline-edit {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--primary);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: inherit;
  color: var(--ink);
  outline: none;
  background: #fff;
}

.data-table .trip-updated {
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}

.data-table .trip-date,
.data-table .trip-route,
.data-table .trip-km,
.data-table .trip-commission {
  cursor: text;
}

.data-table .trip-date input.inline-edit,
.data-table .trip-route select.inline-edit,
.data-table .trip-km input.inline-edit,
.data-table .trip-commission input.inline-edit {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--primary);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: inherit;
  font-size: inherit;
  color: var(--ink);
  outline: none;
  background: #fff;
}

/* ---------- 分页条 ---------- */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid var(--line);
  font-size: 12.5px;
  color: var(--muted);
}

.pager[hidden] {
  display: none;
}

.pager-total {
  font-variant-numeric: tabular-nums;
}

.pager-info {
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}

.pager-btn {
  appearance: none;
  font-family: inherit;
  font-size: 12.5px;
  padding: 5px 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  color: var(--ink);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.pager-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}

.pager-btn:disabled {
  color: #b6c0cd;
  background: #f7f9fc;
  cursor: not-allowed;
}

.pager-jump {
  color: var(--muted);
}

.pager-jump-input {
  width: 44px;
  padding: 4px 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-family: inherit;
  font-size: 12.5px;
  text-align: center;
  color: var(--ink);
}

.pager-jump-input:focus {
  outline: none;
  border-color: var(--primary);
}

/* ---------- 趟次表格：竖向框线 + 拖动调整列宽 ---------- */
.trip-table {
  table-layout: fixed;
}

/* 固定布局下列宽由 colgroup 决定，清掉单元格自带的最小/最大宽度，避免把列撑歪 */
.trip-table .route-name,
.trip-table .container-no,
.trip-table .trip-note {
  min-width: 0;
  max-width: none;
}

/* 公里 / 提成 与其他列统一左对齐（表头和数据一起） */
.trip-table th.num,
.trip-table td.num {
  text-align: left;
}

/* 操作列（删除）也左对齐，右侧留白不再空一大块 */
.trip-table th.op,
.trip-table td.op {
  text-align: left;
}

.trip-table th,
.trip-table td {
  overflow: hidden;
  border-right: 1px solid #e8edf5;
}

.trip-table th {
  position: relative;
  border-right-color: #dde5f1;
  user-select: none;
}

/* 操作列（删除）右侧也保留框线，整张表四边闭合 */

/* 表头右边缘 7px 是拖拽热区，靠近时显示蓝色提示线 */
.trip-table th::after {
  content: '';
  position: absolute;
  top: 0;
  right: -3px;
  bottom: 0;
  width: 7px;
  cursor: col-resize;
  z-index: 2;
}

.trip-table th:hover::after {
  background: rgba(42, 91, 224, 0.28);
}

/* ---------- 直接搭建：目的地可搜索下拉 ---------- */
.dest-picker {
  position: relative;
  flex: 1 1 auto;
  min-width: 160px;
}

.dest-picker .dest-input {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
}

.dest-picker .dest-input::placeholder {
  color: #9aa7bb;
}

.dest-picker .dest-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(42, 91, 224, 0.1);
}

.dest-list {
  position: absolute;
  z-index: 40;
  top: 38px;
  left: 0;
  right: 0;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 14px 30px rgba(16, 24, 40, 0.16);
}

.dest-list .dest-group {
  padding: 6px 8px 3px;
  color: var(--muted);
  font-size: 11.5px;
}

.dest-list .dest-item {
  display: block;
  width: 100%;
  padding: 7px 9px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--ink);
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.dest-list .dest-item:hover {
  background: var(--primary-soft);
  color: var(--primary);
}

.dest-list .dest-empty {
  padding: 10px 9px;
  color: var(--muted);
  font-size: 12.5px;
}
  `,

  init: function () {
    $('tripForm').addEventListener('submit', saveTrip);
    // 选司机 = 只看这个司机的趟次；不选 = 当月全部
    $('tripDriver').addEventListener('change', function () {
      state.tripPage = 1;
      renderTrips();
    });
    $('tripPrevBtn').addEventListener('click', function () {
      if (state.tripPage > 1) gotoTripPage(state.tripPage - 1);
    });
    $('tripNextBtn').addEventListener('click', function () {
      gotoTripPage(state.tripPage + 1);
    });
    $('tripPagerJumpBtn').addEventListener('click', jumpToTripPage);
    $('tripPagerJump').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); jumpToTripPage(); }
    });
    $('tripBuildAddStep').addEventListener('click', addTripBuildStep);
    $('tripBuildOrigin').addEventListener('change', updateAutoTripKm);
    $('tripBuildSteps').addEventListener('click', onTripBuildStepChange);
    $('tripBuildSteps').addEventListener('change', onTripBuildStepChange);
    // 目的地搜索：聚焦展开全部，输入即时过滤，点选写入，失焦还原
    $('tripBuildSteps').addEventListener('focusin', onTripDestFocus);
    $('tripBuildSteps').addEventListener('input', onTripDestInput);
    $('tripBuildSteps').addEventListener('keydown', onTripDestKeydown);
    $('tripBuildSteps').addEventListener('mousedown', function (e) {
      var item = e.target.closest('.dest-item');
      if (!item) return;
      // 抢在失焦之前完成点选，避免列表先关闭
      e.preventDefault();
      selectTripDest(item);
    });
    $('tripBuildSteps').addEventListener('focusout', onTripDestBlur);
    // 点页面其它地方：收起候选列表，并把没选定的输入文字还原
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#tripBuildSteps .dest-picker')) return;
      resetTripDestInputs();
    });

    // 双击单元格 → 行内编辑
    document.addEventListener('dblclick', function (e) {
      var cell = e.target.closest('.container-no[data-trip]');
      if (cell) { e.preventDefault(); editContainerNo(cell); return; }
      var note = e.target.closest('.trip-note[data-trip]');
      if (note) { e.preventDefault(); editTripNote(note); return; }
      var dateCell = e.target.closest('.trip-date[data-trip]');
      if (dateCell) { e.preventDefault(); editTripDate(dateCell); return; }
      var routeCell = e.target.closest('.trip-route[data-trip]');
      if (routeCell) { e.preventDefault(); editTripRoute(routeCell); return; }
      var kmCell = e.target.closest('.trip-km[data-trip]');
      if (kmCell) { e.preventDefault(); editTripNumber(kmCell, 'km'); return; }
      var commissionCell = e.target.closest('.trip-commission[data-trip]');
      if (commissionCell) { e.preventDefault(); editTripNumber(commissionCell, 'commission'); }
    });

    // 表格列宽：竖线、拖动调整、宽度记忆
    bindTripColResize();
    ensureTripColLayout();
  },
});

/* ================= 趟次 ================= */

/* 提成、公里展示为整数，不显示小数（如 ¥120 而非 ¥120.00） */
var intFormat = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });

function yuanInt(value) {
  var amount = Number(value) || 0;
  return (amount < 0 ? '-¥' : '¥') + intFormat.format(Math.abs(amount));
}

function kmInt(value) {
  return intFormat.format(Number(value) || 0);
}

/* ---------- 列宽：默认值 / 读取 / 应用 / 拖动 / 保存 ---------- */
var TRIP_COL_DEFAULT = [110, 90, 240, 220, 90, 90, 160, 90, 150, 60];
var TRIP_COL_MIN = 60;

function tripColEls() {
  var table = document.querySelector('.trip-table');
  return table ? table.querySelectorAll('colgroup col') : [];
}

/** 把宽度写进 colgroup，表格总宽 = 各列之和 */
function applyTripColWidths(widths) {
  var cols = tripColEls();
  var sum = 0;
  widths.forEach(function (w, i) {
    if (!cols[i]) return;
    cols[i].style.width = w + 'px';
    sum += w;
  });
  var table = document.querySelector('.trip-table');
  if (table) table.style.width = sum + 'px';
}

/** 读取列宽：存过就用存的；没存过按容器宽度等比铺满默认值（页面隐藏时先跳过） */
function getTripColWidths() {
  // mountPages 早于 loadDb，初始化阶段 db 还没赋值
  if (!db || !db.configs) return null;
  var cols = tripColEls();
  var count = cols.length || TRIP_COL_DEFAULT.length;
  var saved = db.configs.trip_col_widths;
  if (Array.isArray(saved) && saved.length === count) {
    var ok = saved.every(function (w) {
      return isFinite(Number(w)) && Number(w) >= TRIP_COL_MIN;
    });
    if (ok) {
      var widths = saved.map(Number);
      // 迁移：删除列（最后一列）强制不超过 60，旧默认是 110 太宽
      if (widths.length > 0 && widths[widths.length - 1] > 60) {
        widths[widths.length - 1] = 60;
        db.configs.trip_col_widths = widths;
        saveLocal();
      }
      return widths;
    }
  }
  var table = document.querySelector('.trip-table');
  var box = table && table.parentNode ? table.parentNode.clientWidth : 0;
  if (!box) return null; // 页面还隐藏着，等可见了再算
  var total = TRIP_COL_DEFAULT.reduce(function (s, w) { return s + w; }, 0);
  var widths = TRIP_COL_DEFAULT.map(function (w) { return Math.round(w * box / total); });
  db.configs.trip_col_widths = widths;
  saveLocal();
  return widths;
}

/** 页面可见后应用一次列宽；容器宽度为 0 时什么都不做 */
function ensureTripColLayout() {
  var widths = getTripColWidths();
  if (!widths) return;
  applyTripColWidths(widths);
}

/** 表头右边缘拖动调列宽（只绑一次） */
function bindTripColResize() {
  var table = document.querySelector('.trip-table');
  if (!table || table.dataset.colResize === '1') return;
  table.dataset.colResize = '1';

  var drag = null;
  table.querySelector('thead').addEventListener('mousedown', function (e) {
    var th = e.target.closest('th');
    if (!th) return;
    var rect = th.getBoundingClientRect();
    // 只有指针在右边缘 7px 内才进入拖动，避免干扰正常点击 / 双击
    if (e.clientX < rect.right - 7) return;
    e.preventDefault();
    var index = Array.prototype.indexOf.call(th.parentNode.children, th);
    var widths = getTripColWidths();
    if (!widths) return;
    drag = { index: index, startX: e.clientX, startW: widths[index], widths: widths };
    document.body.style.cursor = 'col-resize';
  });

  window.addEventListener('mousemove', function (e) {
    if (!drag) return;
    drag.widths[drag.index] = Math.max(TRIP_COL_MIN, Math.round(drag.startW + e.clientX - drag.startX));
    applyTripColWidths(drag.widths);
  });

  window.addEventListener('mouseup', function () {
    if (!drag) return;
    document.body.style.cursor = '';
    db.configs.trip_col_widths = drag.widths.map(function (w) { return Math.round(w); });
    saveLocal();
    drag = null;
  });
}

function fillDriverSelect(id) {
  var select = $(id);
  var current = select.value;
  var html = '<option value="">请选择司机</option>';
  db.drivers.forEach(function (driver) {
    html +=
      '<option value="' + driver.id + '">' + esc(driver.name) +
      (driver.plate ? '（' + esc(driver.plate) + '）' : '') + '</option>';
  });
  select.innerHTML = html;
  var exists = db.drivers.some(function (driver) {
    return String(driver.id) === current;
  });
  if (exists) select.value = current;
}

/* ------- 趟次：直接搭建 ------- */
/** 趟次直接搭建：始发地/步骤变化时自动填公里 */
function updateAutoTripKm() {
  var origin = $('tripBuildOrigin').value;
  var steps = collectTripBuildSteps();
  if (origin && steps.length) {
    var autoKm = computeAutoKm(origin, steps);
    // 自定义分组没有公里规则 → 留空，手填
    $('tripKm').value = (autoKm === null ? '' : autoKm);
  }
  // 同步自动提成
  var autoComm = computeAutoCommission(steps);
  var currentComm = parseFloat($('tripCommission').value);
  // 如果提成是 0 或刚好是旧的自动值 → 自动更新；用户手动改过的不覆盖
  if (!currentComm || currentComm === state._lastAutoCommission) {
    $('tripCommission').value = autoComm;
  }
  state._lastAutoCommission = autoComm;
}

function fillTripBuildOrigin() {
  var select = $('tripBuildOrigin');
  var current = select.value;
  var html = '<option value="">始发地</option>';
  (db.configs.origins || []).forEach(function (name) {
    html += '<option value="' + esc(name) + '">' + esc(name) + '</option>';
  });
  select.innerHTML = html;
  if ((db.configs.origins || []).indexOf(current) >= 0) select.value = current;
}

function renderTripBuildSteps(steps) {
  var list = steps && steps.length ? steps : [{ action: '进', dest: '' }];
  var wrap = $('tripBuildSteps');
  var html = '';
  list.forEach(function (step, idx) {
    html +=
      '<div class="step-row" data-step-idx="' + idx + '">' +
      '<span class="step-idx">' + (idx + 1) + '</span>' +
      '<select class="step-action" data-role="action">' +
        '<option value="进"' + (step.action === '进' ? ' selected' : '') + '>进</option>' +
        '<option value="提"' + (step.action === '提' ? ' selected' : '') + '>提</option>' +
        '<option value="还"' + (step.action === '还' ? ' selected' : '') + '>还</option>' +
        '<option value="落"' + (step.action === '落' ? ' selected' : '') + '>落</option>' +
      '</select>' +
      '<div class="dest-picker">' +
        '<input type="text" class="dest-input" data-role="destinput" autocomplete="off"' +
          ' placeholder="输入关键词搜索目的地"' +
          ' value="' + esc(step.dest || '') + '">' +
        '<input type="hidden" data-role="dest" value="' + esc(step.dest || '') + '">' +
        '<div class="dest-list is-hidden" data-role="destlist"></div>' +
      '</div>' +
      '<button type="button" class="step-del" data-role="del" title="删除">×</button>' +
      '</div>';
  });
  wrap.innerHTML = html;
  // 每行先铺好完整候选列表，输入时再按关键词过滤
  wrap.querySelectorAll('.dest-picker').forEach(function (picker) {
    var action = picker.closest('.step-row').querySelector('[data-role="action"]').value;
    fillDestList(picker, action, '');
  });
}

/** 提 / 还 / 落 用提还分组，「进」用进港分组 */
function destGroupList(action) {
  return (action === '提' || action === '还' || action === '落')
    ? (db.configs.dest_pick_groups || [])
    : (db.configs.dest_groups || []);
}

function destItemHtml(name) {
  return '<button type="button" class="dest-item" data-dest="' + esc(name) + '">' +
    esc(name) + '</button>';
}

/** 按关键词重绘某行的目的地候选列表（同时命中分组名则整组显示） */
function fillDestList(picker, action, keyword) {
  var flat = getDestOptionsForAction(action);
  var groups = destGroupList(action);
  var kw = String(keyword || '').trim().toLowerCase();
  var shown = {};
  var html = '';

  groups.forEach(function (group) {
    var members = (group.members || []).filter(function (name) {
      return flat.indexOf(name) >= 0;
    });
    var groupHit = kw && String(group.label || '').toLowerCase().indexOf(kw) >= 0;
    var visible = members.filter(function (name) {
      return !kw || groupHit || String(name).toLowerCase().indexOf(kw) >= 0;
    });
    if (!visible.length) return;
    html += '<div class="dest-group">' + esc(group.label) + '</div>';
    visible.forEach(function (name) {
      html += destItemHtml(name);
      shown[name] = true;
    });
  });

  var rest = flat.filter(function (name) {
    return !shown[name] && (!kw || String(name).toLowerCase().indexOf(kw) >= 0);
  });
  if (rest.length) {
    if (html) html += '<div class="dest-group">其他</div>';
    rest.forEach(function (name) {
      html += destItemHtml(name);
    });
  }

  picker.querySelector('[data-role="destlist"]').innerHTML =
    html || '<div class="dest-empty">没有匹配的目的地</div>';
}

/** 点选候选项：写回隐藏字段与输入框 */
function selectTripDest(item) {
  var picker = item.closest('.dest-picker');
  var row = picker.closest('.step-row');
  var name = item.dataset.dest;
  row.querySelector('[data-role="dest"]').value = name;
  row.querySelector('[data-role="destinput"]').value = name;
  picker.querySelector('[data-role="destlist"]').classList.add('is-hidden');
  updateAutoTripKm();
}

function closeDestLists() {
  document.querySelectorAll('#tripBuildSteps [data-role="destlist"]').forEach(function (list) {
    list.classList.add('is-hidden');
  });
}

/** 聚焦输入框：展开候选；已选过目的地就先展示全部再筛 */
function onTripDestFocus(event) {
  var input = event.target.closest('[data-role="destinput"]');
  if (!input) return;
  var row = input.closest('.step-row');
  var confirmed = row.querySelector('[data-role="dest"]').value;
  var picker = row.querySelector('.dest-picker');
  var keyword = input.value === confirmed ? '' : input.value;
  fillDestList(picker, row.querySelector('[data-role="action"]').value, keyword);
  picker.querySelector('[data-role="destlist"]').classList.remove('is-hidden');
}

function onTripDestInput(event) {
  var input = event.target.closest('[data-role="destinput"]');
  if (!input) return;
  var row = input.closest('.step-row');
  fillDestList(row.querySelector('.dest-picker'), row.querySelector('[data-role="action"]').value, input.value);
  row.querySelector('[data-role="destlist"]').classList.remove('is-hidden');
}

function onTripDestKeydown(event) {
  var input = event.target.closest('[data-role="destinput"]');
  if (!input) return;
  if (event.key === 'Escape') {
    input.blur();
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    var first = input.closest('.dest-picker').querySelector('.dest-item');
    if (first) selectTripDest(first);
  }
}

/** 失焦：没点选就把输入框还原成已确认的目的地 */
function onTripDestBlur(event) {
  var input = event.target.closest ? event.target.closest('[data-role="destinput"]') : null;
  if (!input) return;
  var row = input.closest('.step-row');
  input.value = row.querySelector('[data-role="dest"]').value;
  closeDestLists();
}

/** 离开目的地选择区：输入框还原成已确认值，候选列表收起 */
function resetTripDestInputs() {
  document.querySelectorAll('#tripBuildSteps .step-row').forEach(function (row) {
    row.querySelector('[data-role="destinput"]').value = row.querySelector('[data-role="dest"]').value;
  });
  closeDestLists();
}

function collectTripBuildSteps() {
  var rows = document.querySelectorAll('#tripBuildSteps .step-row');
  var steps = [];
  rows.forEach(function (row) {
    var actionSel = row.querySelector('[data-role="action"]');
    var destSel = row.querySelector('[data-role="dest"]');
    if (actionSel && destSel && destSel.value) {
      steps.push({ action: actionSel.value, dest: destSel.value });
    }
  });
  return steps;
}

function onTripBuildStepChange(event) {
  var target = event.target;
  if (target.matches('[data-role="action"]')) {
    var row = target.closest('.step-row');
    // 动作换了，原目的地不再适用，清空重选
    row.querySelector('[data-role="dest"]').value = '';
    row.querySelector('[data-role="destinput"]').value = '';
    fillDestList(row.querySelector('.dest-picker'), target.value, '');
  } else if (target.matches('[data-role="del"]')) {
    var idx = Number(target.closest('.step-row').dataset.stepIdx);
    var steps = collectTripBuildSteps();
    steps.splice(idx, 1);
    if (!steps.length) steps.push({ action: '进', dest: '' });
    renderTripBuildSteps(steps);
  }
  // 任何步骤变化 → 重算公里
  updateAutoTripKm();
}

function addTripBuildStep() {
  var existing = collectTripBuildSteps();
  if (existing.length >= 4) { toast('最多 4 段', 'error'); return; }
  existing.push({ action: '提', dest: '' });
  renderTripBuildSteps(existing);
  updateAutoTripKm();
}

function saveTrip(event) {
  event.preventDefault();
  try {
    var payload = {
      date: $('tripDate').value,
      driver_id: $('tripDriver').value,
      route_origin: $('tripBuildOrigin').value,
      route_steps: collectTripBuildSteps(),
      km: $('tripKm').value,
      commission: $('tripCommission').value,
    };

    var trip = addTrip(payload);
    ensureMonth(trip.date);
    toast('趟次已保存');
    // reset
    fillTripBuildOrigin();
    $('tripBuildOrigin').value = '';
    renderTripBuildSteps([{ action: '进', dest: '' }]);
    $('tripKm').value = '';
    $('tripCommission').value = '';
    renderPage();
    $('tripBuildOrigin').focus();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function filteredTrips() {
  var month = state.month;
  var driverId = $('tripDriver').value;
  var monthRows = db.trips.filter(function (item) {
    return String(item.date).slice(0, 7) === month;
  });
  return (driverId
    ? monthRows.filter(function (item) {
        return String(item.driver_id) === String(driverId);
      })
    : monthRows
  ).sort(function (a, b) {
    return b.date.localeCompare(a.date) || b.id - a.id;
  });
}

function renderTrips() {
  ensureTripColLayout();
  var driverId = $('tripDriver').value;
  var rows = filteredTrips();

  var tbody = $('tripRows');
  if (!rows.length) {
    var hint = driverId
      ? '本月这个司机还没有趟次记录'
      : db.trips.length
        ? '本月还没有趟次记录 · 试试切换月份（共有 ' + db.trips.length + ' 笔历史数据）'
        : '还没有趟次记录';
    tbody.innerHTML = '<tr><td colspan="10" class="empty-cell">' + hint + '</td></tr>';
    $('tripSummary').textContent = '共 0 趟';
    updateTripPager(0, 0);
    return;
  }

  // 分页：每页固定 12 条
  var totalPages = Math.ceil(rows.length / TRIP_PAGE_SIZE);
  if (state.tripPage > totalPages) state.tripPage = totalPages;
  if (state.tripPage < 1) state.tripPage = 1;
  var start = (state.tripPage - 1) * TRIP_PAGE_SIZE;
  var pageRows = rows.slice(start, start + TRIP_PAGE_SIZE);

  tbody.innerHTML = pageRows
    .map(function (trip) {
      var driver = db.drivers.find(function (item) {
        return item.id === trip.driver_id;
      });
      return (
        '<tr><td class="trip-date" data-trip="' + trip.id + '" title="双击修改日期">' +
          esc(trip.date) + '</td>' +
        '<td>' + esc(driver ? driver.name : '—') + '</td>' +
        '<td class="route-name trip-route" data-trip="' + trip.id + '" title="双击编辑线路名">' +
          esc(trip.route_name) + '</td>' +
        '<td class="container-no" data-trip="' + trip.id + '" title="双击编辑 · 箱号或提单号多个用逗号/空格隔开">' +
          renderContainerChips(trip.container_no) + '</td>' +
        '<td class="num trip-km" data-trip="' + trip.id + '" title="双击编辑公里数">' +
          kmInt(trip.km) + '</td>' +
        '<td class="num trip-commission" data-trip="' + trip.id + '" title="双击编辑提成">' +
          yuanInt(trip.commission) + '</td>' +
        '<td class="trip-note" data-trip="' + trip.id + '" title="双击编辑">' +
          esc(trip.note || '') + '</td>' +
        '<td class="trip-updater">' + esc(trip.updated_by || '—') + '</td>' +
        '<td class="trip-updated">' + esc(trip.updated_at || '—') + '</td>' +
        '<td class="op"><button type="button" class="link-danger" data-del-trip="' +
        trip.id + '">删除</button></td></tr>'
      );
    })
    .join('');

  var km = rows.reduce(function (sum, item) {
    return sum + Number(item.km);
  }, 0);
  var commission = rows.reduce(function (sum, item) {
    return sum + Number(item.commission);
  }, 0);
  $('tripSummary').innerHTML =
    '共 <b>' + rows.length + '</b> 趟 · ' + kmInt(km) + ' km · ' + yuanInt(commission);

  updateTripPager(rows.length, totalPages);
}

/** 刷新分页条：总条数、当前页/总页数、按钮可用状态 */
function updateTripPager(total, totalPages) {
  var pager = $('tripPager');
  var prev = $('tripPrevBtn');
  var next = $('tripNextBtn');
  if (!totalPages) {
    pager.hidden = true;
    return;
  }
  pager.hidden = totalPages <= 1;
  $('tripPagerTotal').textContent = '共 ' + total + ' 条';
  $('tripPagerInfo').textContent = state.tripPage + ' / ' + totalPages;
  prev.disabled = state.tripPage <= 1;
  next.disabled = state.tripPage >= totalPages;
  $('tripPagerJump').value = '';
}

function gotoTripPage(page) {
  state.tripPage = page;
  renderTrips();
}

/** 跳页输入框：非法或超出范围就提示并恢复原值 */
function jumpToTripPage() {
  var rows = filteredTrips();
  var totalPages = Math.ceil(rows.length / TRIP_PAGE_SIZE);
  var input = $('tripPagerJump');
  var page = parseInt(input.value, 10);
  if (!page || page < 1 || page > totalPages) {
    input.value = '';
    toast('请输入 1 ~ ' + totalPages + ' 之间的页码', 'error');
    return;
  }
  gotoTripPage(page);
}

/* ================= 行内操作 ================= */

/** 当前时间戳，写进趟次的「更新时间」列 */
function tripStamp() {
  return nowStamp();
}

/** 记录本次修改的人和时间 */
function markTripUpdated(trip) {
  trip.updated_by = operatorName();
  trip.updated_at = tripStamp();
}

/** 双击日期单元格 → 内联改日期（跨月会自动跳月份） */
function editTripDate(cell) {
  var tripId = Number(cell.dataset.trip);
  var trip = db.trips.find(function (t) { return t.id === tripId; });
  if (!trip) return;

  var input = document.createElement('input');
  input.type = 'date';
  input.value = trip.date;
  input.className = 'inline-edit';
  input.style.width = '100%';

  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    var v = input.value;
    if (!v || !validDate(v)) { renderTrips(); return; }
    if (v === trip.date) { renderTrips(); return; }
    trip.date = v;
    markTripUpdated(trip);
    saveLocal();
    if (String(v).slice(0, 7) !== state.month) ensureMonth(v);
    renderPage();
    toast('日期已改为 ' + v);
  }
  input.addEventListener('blur', finish);
  input.addEventListener('change', finish);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { done = true; input.blur(); renderTrips(); }
  });
}

/** 双击线路单元格 → 直接改线路名字符 */
function editTripRoute(cell) {
  var tripId = Number(cell.dataset.trip);
  var trip = db.trips.find(function (t) { return t.id === tripId; });
  if (!trip) return;

  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-edit';
  input.style.width = '100%';
  input.value = trip.route_name || '';

  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();

  var done = false;
  function apply() {
    if (done) return;
    done = true;
    var newName = input.value.trim();
    if (!newName) { renderTrips(); return; }
    if (newName === trip.route_name) { renderTrips(); return; }
    trip.route_name = newName;
    markTripUpdated(trip);
    saveLocal();
    renderPage();
  }
  input.addEventListener('blur', apply);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { done = true; renderTrips(); }
  });
}

/** 把 container_no 字符串拆成数组（按逗号/分号/中文逗号/顿号/空格分隔），清洗后大写 */
function splitContainerNos(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,;，、\s]+/)
    .map(function (s) { return s.trim().toUpperCase(); })
    .filter(function (s) { return s.length > 0; });
}

/** 把多个箱号渲染成 chip 标签 */
function renderContainerChips(raw) {
  var nos = splitContainerNos(raw);
  if (!nos.length) return '';
  return nos.map(function (n) {
    return '<span class="container-chip">' + esc(n) + '</span>';
  }).join('');
}

/** 双击箱号单元格 → 内联编辑（支持多个箱号，逗号/空格分隔） */
function editContainerNo(cell) {
  var tripId = Number(cell.dataset.trip);
  var trip = db.trips.find(function (t) { return t.id === tripId; });
  if (!trip) return;

  var current = trip.container_no || '';
  var input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.className = 'inline-edit';
  input.style.width = '100%';
  input.placeholder = '箱号或提单号，多个用逗号/空格隔开';

  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();

  function finish() {
    // 清洗：按分隔符拆分 → 去重 → 大写 → 用 ", " 拼回
    var cleaned = splitContainerNos(input.value);
    var v = cleaned.join(', ');
    if (v !== (trip.container_no || '')) markTripUpdated(trip);
    trip.container_no = v;
    saveLocal();
    renderTrips();
  }
  input.addEventListener('blur', finish);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') {
      input.removeEventListener('blur', finish);
      renderTrips();
    }
  });
}

/** 双击备注单元格 → 内联编辑 */
function editTripNote(cell) {
  var tripId = Number(cell.dataset.trip);
  var trip = db.trips.find(function (t) { return t.id === tripId; });
  if (!trip) return;

  var current = trip.note || '';
  var input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.className = 'inline-edit';
  input.style.width = '100%';
  input.placeholder = '备注（可选）';

  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();

  function finish() {
    var v = input.value.trim();
    if (v !== (trip.note || '')) markTripUpdated(trip);
    trip.note = v;
    saveLocal();
    renderTrips();
  }
  input.addEventListener('blur', finish);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') {
      input.removeEventListener('blur', finish);
      renderTrips();
    }
  });
}

/** 双击公里 / 提成单元格 → 内联填数字（留空视为 0） */
function editTripNumber(cell, field) {
  var tripId = Number(cell.dataset.trip);
  var trip = db.trips.find(function (t) { return t.id === tripId; });
  if (!trip) return;

  var isKm = field === 'km';
  var oldValue = Number(trip[field]) || 0;
  var input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.value = String(oldValue);
  input.className = 'inline-edit';
  input.style.width = '100%';
  input.style.textAlign = 'right';
  input.placeholder = isKm ? '公里' : '提成';

  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    var raw = input.value.replace(/[^0-9.\-]/g, '');
    var v = raw === '' ? 0 : Number(raw);
    if (isNaN(v)) v = 0;
    v = round2(v);
    if (v !== oldValue) markTripUpdated(trip);
    trip[field] = v;
    saveLocal();
    renderPage();
  }
  input.addEventListener('blur', finish);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { done = true; renderTrips(); }
  });
}

function handleRowAction(event) {
  var target = event.target;

  var tripButton = target.closest('[data-del-trip]');
  if (tripButton) {
    if (!confirm('确定删除这条趟次记录吗？')) return;
    removeTripAsync(Number(tripButton.dataset.delTrip));
    return;
  }

  var fuelButton = target.closest('[data-del-fuel]');
  if (fuelButton) {
    if (!confirm('确定删除这条加油记录吗？')) return;
    removeFuelAsync(Number(fuelButton.dataset.delFuel));
    return;
  }

  var driverEdit = target.closest('[data-edit-driver]');
  if (driverEdit) {
    editDriver(Number(driverEdit.dataset.editDriver));
    return;
  }

  var driverDelete = target.closest('[data-del-driver]');
  if (driverDelete) {
    var driver = db.drivers.find(function (item) {
      return item.id === Number(driverDelete.dataset.delDriver);
    });
    if (!driver) return;
    if (!confirm('确定删除司机「' + driver.name + '」吗？')) return;
    removeDriverAsync(driver.id);
    return;
  }

  var routeEdit = target.closest('[data-edit-route]');
  if (routeEdit) {
    editRoute(Number(routeEdit.dataset.editRoute));
    return;
  }

  var routeDelete = target.closest('[data-del-route]');
  if (routeDelete) {
    var route = db.routes.find(function (item) {
      return item.id === Number(routeDelete.dataset.delRoute);
    });
    if (!route) return;
    if (!confirm('确定删除线路「' + buildRouteName(route) + '」吗？已录入的历史趟次不受影响。')) return;
    removeRouteAsync(route.id);
  }
}

function removeTripAsync(id) {
  try {
    removeTrip(id);
    toast('趟次已删除');
    renderPage();
  } catch (error) { toast(error.message, 'error'); }
}

function removeFuelAsync(id) {
  try {
    removeFuel(id);
    toast('加油记录已删除');
    renderPage();
  } catch (error) { toast(error.message, 'error'); }
}

function removeDriverAsync(id) {
  try {
    removeDriver(id);
    toast('司机已删除');
    resetDriverForm();
    refreshData();
    renderPage();
  } catch (error) { toast(error.message, 'error'); }
}

function removeRouteAsync(id) {
  try {
    removeRoute(id);
    toast('线路已删除');
    resetRouteForm();
    refreshData();
    renderPage();
  } catch (error) { toast(error.message, 'error'); }
}

