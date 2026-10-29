/* ===== js/init.js ===== */
/* 初始化 / 月份 / 页面切换 */
'use strict';

  /* ================= 初始化 ================= */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindRoleControls();
    if (!getRole()) {
      $('roleGate').classList.remove('is-hidden');
      return;
    }
    startApp();
  }

  /* ================= 身份选择 / 切换 ================= */
  function bindRoleControls() {
    $('roleStaffBtn').addEventListener('click', function () {
      setRole('staff');
      startApp();
    });
    $('roleManagerBtn').addEventListener('click', function () {
      $('roleGateActions').classList.add('is-hidden');
      $('rolePinWrap').classList.remove('is-hidden');
      $('rolePinError').classList.add('is-hidden');
      $('rolePinInput').value = '';
      $('rolePinInput').focus();
    });
    $('rolePinCancel').addEventListener('click', function () {
      $('rolePinWrap').classList.add('is-hidden');
      $('roleGateActions').classList.remove('is-hidden');
      $('rolePinError').classList.add('is-hidden');
    });
    $('rolePinOk').addEventListener('click', tryManagerLogin);
    $('rolePinInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); tryManagerLogin(); }
    });

    $('roleChip').addEventListener('click', function (e) {
      e.stopPropagation();
      $('roleMenu').classList.toggle('is-hidden');
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.role-box')) $('roleMenu').classList.add('is-hidden');
    });
    $('roleChangePin').addEventListener('click', changeManagerPin);
    $('roleExit').addEventListener('click', function () {
      if (!confirm('切换为员工模式？')) return;
      setRole('staff');
      location.reload();
    });
  }

  function tryManagerLogin() {
    // db 未加载时先读一次，才能校验改过的 PIN
    if (!db) loadDb();
    var pin = String($('rolePinInput').value || '').trim();
    if (!/^\d{4}$/.test(pin)) {
      showPinError('请输入 4 位数字');
      return;
    }
    if (pin !== managerPin()) {
      showPinError('PIN 不正确');
      return;
    }
    setRole('manager');
    startApp();
  }

  function showPinError(text) {
    var el = $('rolePinError');
    el.textContent = text;
    el.classList.remove('is-hidden');
    $('rolePinInput').focus();
  }

  function changeManagerPin() {
    $('roleMenu').classList.add('is-hidden');
    var next = window.prompt('输入新的 4 位主管 PIN', '');
    if (next === null) return;
    next = String(next).trim();
    if (!/^\d{4}$/.test(next)) {
      toast('PIN 必须是 4 位数字', 'error');
      return;
    }
    db.configs.manager_pin = next;
    saveLocal();
    toast('主管 PIN 已修改', 'success');
  }

  /** 按身份刷新界面：员工隐藏只读入口并显示提示条 */
  function applyRole() {
    var manager = isManager();
    document.body.classList.toggle('is-staff', !manager);
    var chip = $('roleChip');
    chip.textContent = manager ? '主管' : '员工';
    chip.classList.toggle('is-staff', !manager);
    $('roleBanner').classList.toggle('is-hidden', manager);
    $('roleGate').classList.add('is-hidden');
  }

  function startApp() {
    mountPages();
    loadDb();

    var now = new Date();
    state.month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    buildMonthOptions();
    $('tripDate').value = todayString();
    $('fuelDate').value = todayString();
    $('attMonth').value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    $('nav').addEventListener('click', function (event) {
      var button = event.target.closest('.nav-btn');
      if (button) switchPage(button.dataset.page);
    });

    $('monthSelect').addEventListener('change', function (event) {
      if (!event.target.value) return;
      state.month = event.target.value;
      state.tripPage = 1;
      renderPage();
    });
    $('monthPrev').addEventListener('click', function () {
      shiftMonth(-1);
    });
    $('monthNext').addEventListener('click', function () {
      shiftMonth(1);
    });

    // 月度结算页（含数据备份）的事件绑定在 pages/settlement.js 里

    // 趟次录入页的事件绑定在 pages/trips.js 里
    // 出勤登记、地图等页面的事件绑定分别在 pages/attendance.js、pages/map.js 里

    // 线路价目页（含始发地 / 进港区 / 提还堆场管理弹窗）的事件绑定在 pages/routes.js 里

    document.addEventListener('click', handleRowAction);

    applyRole();
    placeMonthBox(state.page);
    refreshData();
    applyTripMode();
    renderPage();
    registerServiceWorker();
  }

  /* ================= 离线缓存 ================= */
  /** 线上注册 Service Worker：整页缓存到本地，第二次打开秒开、断网可用。
   *  本地开发（localhost）不注册，避免缓存干扰热更新。 */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.protocol !== 'http:') return;
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }

  function refreshData() {
    fillDriverSelect('tripDriver');
    fillDriverSelect('fuelDriver');
    fillAttDriverSelect();
    fillRouteSelect();
    fillOriginSelect();
    fillTripBuildOrigin();
    renderStepsEditor([]);
    renderDriverTable();
    renderRouteTable();
  }

  /* ================= 月份 ================= */
  function buildMonthOptions() {
    var select = $('monthSelect');
    var now = new Date();
    var cursor = new Date(now.getFullYear() - 3, 0, 1);
    var end = new Date(now.getFullYear() + 1, 11, 1);
    var html = '';
    while (cursor <= end) {
      var month =
        cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0');
      html += '<option value="' + month + '">' + monthLabel(month) + '</option>';
      cursor.setMonth(cursor.getMonth() + 1);
    }
    select.innerHTML = html;
    select.value = state.month;
  }

  function shiftMonth(delta) {
    var parts = state.month.split('-').map(Number);
    var target = new Date(parts[0], parts[1] - 1 + delta, 1);
    var value = target.getFullYear() + '-' + String(target.getMonth() + 1).padStart(2, '0');
    var exists = Array.prototype.some.call($('monthSelect').options, function (option) {
      return option.value === value;
    });
    if (!exists) return;
    state.month = value;
    state.tripPage = 1;
    $('monthSelect').value = value;
    renderPage();
  }

  function ensureMonth(dateString) {
    var month = String(dateString).slice(0, 7);
    if (!month || month === state.month) return;
    state.month = month;
    state.tripPage = 1;
    var select = $('monthSelect');
    var exists = Array.prototype.some.call(select.options, function (option) {
      return option.value === month;
    });
    if (!exists) {
      var option = document.createElement('option');
      option.value = month;
      option.textContent = monthLabel(month);
      select.appendChild(option);
    }
    select.value = month;
    toast('已切换到 ' + monthLabel(month));
  }

  /* ================= 页面 ================= */
  function switchPage(page) {
    state.page = page;
    document.querySelectorAll('.nav-btn').forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(function (section) {
      section.classList.toggle('is-active', section.id === 'page-' + page);
    });
    placeMonthBox(page);
    renderPage();
  }

  /** 需要月份控件的页面，以及各自的小标签文案 */
  var MONTH_PAGES = { settlement: '结算月份', trips: '统计月份', fuel: '统计月份' };

  /** 月份控件跟随页面：挂到当前页标题行右侧，不依赖月份的页面就隐藏 */
  function placeMonthBox(page) {
    var box = $('monthBox');
    var label = MONTH_PAGES[page];
    if (!label) {
      box.classList.add('is-hidden');
      return;
    }
    box.classList.remove('is-hidden');
    $('monthLabel').textContent = label;
    var head = document.querySelector('#page-' + page + ' .page-head');
    if (!head) return;
    var actions = head.querySelector('.page-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'page-actions';
      head.appendChild(actions);
    }
    actions.insertBefore(box, actions.firstChild);
  }

  function renderPage() {
    try {
      if (state.page === 'settlement') return renderSettlement();
      if (state.page === 'trips') return renderTrips();
      if (state.page === 'fuel') return renderFuel();
      if (state.page === 'attendance') return renderAttCalendar();
      if (state.page === 'map') return renderMapPage();
      if (state.page === 'drivers') return renderDriverTable();
      if (state.page === 'routes') return renderRouteTable();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

