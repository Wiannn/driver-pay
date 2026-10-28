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

      <!-- 路线：模板 / 直接搭建 双模式 -->
      <div class="field field-wide">
        <label>
          路线
          <button type="button" class="btn btn-ghost mode-switch-btn" id="tripModeSwitch">切换为模板</button>
        </label>

        <!-- 模式A：模板 -->
        <div id="tripModeTemplate" class="is-hidden">
          <div class="field-inline">
            <select id="tripRoute"></select>
          </div>
        </div>

        <!-- 模式B：直接搭建 -->
        <div id="tripModeBuild">
          <div class="field-inline" style="margin-bottom:8px">
            <select id="tripBuildOrigin"></select>
            <button type="button" class="btn btn-ghost" id="tripBuildAddStep">+ 添加步骤</button>
          </div>
          <div id="tripBuildSteps"></div>
        </div>
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
        <table class="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>司机</th>
              <th>线路</th>
              <th>箱号 / 提单号</th>
              <th class="num">公里数</th>
              <th class="num">提成</th>
              <th>备注</th>
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
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
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
    $('tripRoute').addEventListener('change', syncRouteFields);
    $('tripModeSwitch').addEventListener('click', switchTripMode);
    $('tripBuildAddStep').addEventListener('click', addTripBuildStep);
    $('tripBuildOrigin').addEventListener('change', updateAutoTripKm);
    $('tripBuildSteps').addEventListener('click', onTripBuildStepChange);
    $('tripBuildSteps').addEventListener('change', onTripBuildStepChange);

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
  },
});

/* ================= 趟次 ================= */
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

function fillRouteSelect() {
  var select = $('tripRoute');
  var current = select.value;

  if (!db.routes.length) {
    select.innerHTML = '<option value="">请先到「线路价目」添加线路</option>';
    return;
  }

  var routes = db.routes.slice().sort(function (a, b) {
    return buildRouteName(a).localeCompare(buildRouteName(b), 'zh-CN');
  });
  var html = '<option value="">请选择线路</option>';
  routes.forEach(function (route) {
    html +=
      '<option value="' + route.id + '">' + esc(buildRouteName(route)) + ' · ' +
      fmt2(route.total_km) + ' km · ' + yuan(route.total_commission) + '</option>';
  });
  select.innerHTML = html;

  var exists = routes.some(function (route) {
    return String(route.id) === current;
  });
  if (exists) select.value = current;
}

function syncRouteFields() {
  var routeId = Number($('tripRoute').value);
  var route = db.routes.find(function (item) {
    return item.id === routeId;
  });
  if (!route) return;
  $('tripKm').value = route.total_km;
  $('tripCommission').value = route.total_commission;
}

/* ------- 趟次：直接搭建模式 ------- */
/** 趟次直接搭建：始发地/步骤变化时自动填公里 */
function updateAutoTripKm() {
  if (state.tripMode !== 'build') return;
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

function switchTripMode() {
  state.tripMode = state.tripMode === 'template' ? 'build' : 'template';
  applyTripMode();
}

/** 按当前的 state.tripMode 把两种模式切换到界面上 */
function applyTripMode() {
  var build = state.tripMode === 'build';
  $('tripModeTemplate').classList.toggle('is-hidden', build);
  $('tripModeBuild').classList.toggle('is-hidden', !build);
  $('tripModeSwitch').textContent = build ? '切换为模板' : '切换为直接搭建';
  if (build) {
    fillTripBuildOrigin();
    renderTripBuildSteps([{ action: '进', dest: '' }]);
    updateAutoTripKm();
  } else {
    $('tripBuildSteps').innerHTML = '';
  }
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
    var destHtml = getDestOptionsGroupedHtml(step.action, step.dest);
    html +=
      '<div class="step-row" data-step-idx="' + idx + '">' +
      '<span class="step-idx">' + (idx + 1) + '</span>' +
      '<select class="step-action" data-role="action">' +
        '<option value="进"' + (step.action === '进' ? ' selected' : '') + '>进</option>' +
        '<option value="提"' + (step.action === '提' ? ' selected' : '') + '>提</option>' +
        '<option value="还"' + (step.action === '还' ? ' selected' : '') + '>还</option>' +
        '<option value="落"' + (step.action === '落' ? ' selected' : '') + '>落</option>' +
      '</select>' +
      '<select class="step-dest" data-role="dest">' + destHtml + '</select>' +
      '<button type="button" class="step-del" data-role="del" title="删除">×</button>' +
      '</div>';
  });
  wrap.innerHTML = html;
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
    var destSel = row.querySelector('[data-role="dest"]');
    destSel.innerHTML = getDestOptionsGroupedHtml(target.value, '');
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
      km: $('tripKm').value,
      commission: $('tripCommission').value,
    };

    if (state.tripMode === 'template') {
      payload.route_id = $('tripRoute').value;
    } else {
      payload.route_id = '';
      payload.route_origin = $('tripBuildOrigin').value;
      payload.route_steps = collectTripBuildSteps();
    }

    var trip = addTrip(payload);
    ensureMonth(trip.date);
    toast('趟次已保存');
    // reset
    fillRouteSelect();
    $('tripRoute').value = '';
    $('tripBuildOrigin').value = '';
    renderTripBuildSteps([]);
    $('tripKm').value = '';
    $('tripCommission').value = '';
    renderPage();
    if (state.tripMode === 'template') $('tripRoute').focus();
    else $('tripBuildOrigin').focus();
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
  var driverId = $('tripDriver').value;
  var rows = filteredTrips();

  var tbody = $('tripRows');
  if (!rows.length) {
    var hint = driverId
      ? '本月这个司机还没有趟次记录'
      : db.trips.length
        ? '本月还没有趟次记录 · 试试切换月份（共有 ' + db.trips.length + ' 笔历史数据）'
        : '还没有趟次记录';
    tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">' + hint + '</td></tr>';
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
        '<td class="route-name trip-route" data-trip="' + trip.id + '" title="双击更换路线">' +
          esc(trip.route_name) + '</td>' +
        '<td class="container-no" data-trip="' + trip.id + '" title="双击编辑 · 箱号或提单号多个用逗号/空格隔开">' +
          renderContainerChips(trip.container_no) + '</td>' +
        '<td class="num trip-km" data-trip="' + trip.id + '" title="双击编辑公里数">' +
          fmt2(trip.km) + '</td>' +
        '<td class="num trip-commission" data-trip="' + trip.id + '" title="双击编辑提成">' +
          yuan(trip.commission) + '</td>' +
        '<td class="trip-note" data-trip="' + trip.id + '" title="双击编辑">' +
          esc(trip.note || '') + '</td>' +
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
    '共 <b>' + rows.length + '</b> 趟 · ' + fmt2(km) + ' km · ' + yuan(commission);

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
  var d = new Date();
  function p(n) { return String(n).padStart(2, '0'); }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
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
    trip.updated_at = tripStamp();
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

/** 双击线路单元格 → 下拉换一条路线，公里与提成按新路线重算 */
function editTripRoute(cell) {
  var tripId = Number(cell.dataset.trip);
  var trip = db.trips.find(function (t) { return t.id === tripId; });
  if (!trip) return;
  if (!db.routes.length) {
    toast('路线库还没有路线，先去「线路价目」添加', 'error');
    return;
  }

  var select = document.createElement('select');
  select.className = 'inline-edit';
  select.style.width = '100%';
  select.innerHTML = db.routes.map(function (r) {
    return '<option value="' + r.id + '">' + esc(buildRouteName(r)) + '</option>';
  }).join('');
  if (trip.route_id) select.value = String(trip.route_id);

  cell.innerHTML = '';
  cell.appendChild(select);
  select.focus();

  var done = false;
  function apply() {
    if (done) return;
    done = true;
    var route = db.routes.find(function (r) { return String(r.id) === select.value; });
    if (!route) { renderTrips(); return; }
    var newName = buildRouteName(route);
    if (String(trip.route_id) === String(route.id) && newName === trip.route_name) {
      renderTrips();
      return;
    }
    trip.route_id = route.id;
    trip.route_origin = route.origin;
    trip.route_steps = JSON.parse(JSON.stringify(route.steps || []));
    trip.route_name = newName;
    // 换路线后公里/提成按新路线重算；原来手填过就让你决定是否保留
    var autoKm = computeAutoKm(route.origin, trip.route_steps);
    var autoCommission = computeAutoCommission(trip.route_steps);
    var keepOld = false;
    if ((trip.km || trip.km === 0) && String(trip.km) !== String(autoKm === null ? '' : autoKm)) {
      keepOld = confirm(
        '原公里 ' + fmt2(trip.km) + '，按新路线应为 ' + (autoKm === null ? '留空' : fmt2(autoKm)) +
        '\n\n点「确定」保留原来的公里和提成，点「取消」按新路线重算'
      );
    }
    if (!keepOld) {
      trip.km = autoKm === null ? 0 : autoKm;
      trip.commission = autoCommission;
    }
    trip.updated_at = tripStamp();
    saveLocal();
    renderPage();
    toast('线路已改为「' + newName + '」');
  }
  select.addEventListener('change', apply);
  select.addEventListener('blur', function () { if (!done) renderTrips(); });
  select.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); apply(); }
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
    if (v !== (trip.container_no || '')) trip.updated_at = tripStamp();
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
    if (v !== (trip.note || '')) trip.updated_at = tripStamp();
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
    if (v !== oldValue) trip.updated_at = tripStamp();
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

