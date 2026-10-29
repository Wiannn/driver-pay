/* ===== js/init.js ===== */
/* 初始化 / 月份 / 页面切换 */
'use strict';

  /* ================= 初始化 ================= */
  document.addEventListener('DOMContentLoaded', init);

  /** 主界面是否已初始化（退出后重新选身份时不再重复挂载） */
  var appStarted = false;

  function init() {
    bindRoleChip();
    if (!getRole()) {
      showAuth();
      return;
    }
    startApp();
  }

  /* ================= 顶栏身份菜单 ================= */
  function bindRoleChip() {
    $('roleChip').addEventListener('click', function (e) {
      e.stopPropagation();
      $('roleMenu').classList.toggle('is-hidden');
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.role-box')) $('roleMenu').classList.add('is-hidden');
    });
    $('roleChangePin').addEventListener('click', changeManagerPin);
    $('roleExit').addEventListener('click', exitToAuth);
  }

  /** 修改主管 PIN：必须先输对当前 PIN，再设置新的 */
  function changeManagerPin() {
    $('roleMenu').classList.add('is-hidden');
    if (!isManager()) {
      toast('只有主管可以修改 PIN', 'error');
      return;
    }
    var oldPin = window.prompt('请先输入当前主管 PIN', '');
    if (oldPin === null) return;
    if (String(oldPin).trim() !== managerPin()) {
      toast('当前 PIN 不正确', 'error');
      return;
    }
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

  /** 按身份刷新界面：员工隐藏只读入口 */
  function applyRole() {
    var manager = isManager();
    document.body.classList.toggle('is-staff', !manager);
    var chip = $('roleChip');
    chip.textContent = manager ? '主管' : '员工';
    chip.classList.toggle('is-staff', !manager);
    $('roleChangePin').classList.toggle('is-hidden', !manager);
  }

  function startApp() {
    appStarted = true;
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

    bindDriverSync();

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
    syncDriverSelects();
    fillOriginSelect();
    fillTripBuildOrigin();
    renderStepsEditor([]);
    renderDriverTable();
    renderRouteTable();
  }

  /* ================= 司机联动 ================= */
  /** 三个页面用到司机的下拉；任选一个，其它页面跟着选中，省得每页重选 */
  var DRIVER_SELECTS = ['tripDriver', 'fuelDriver', 'attDriver'];

  function bindDriverSync() {
    DRIVER_SELECTS.forEach(function (id) {
      $(id).addEventListener('change', function () {
        var driverId = this.value;
        // 选「请选择 / 全部」只影响当前页，不改动其他页
        if (!driverId) return;
        DRIVER_SELECTS.forEach(function (otherId) {
          if (otherId === id) return;
          var select = $(otherId);
          var found = Array.prototype.some.call(select.options, function (option) {
            return option.value === driverId;
          });
          if (found) select.value = driverId;
        });
      });
    });
  }

  /** 某页下拉被重填（司机增删）后，尽量维持全站同一个司机 */
  function syncDriverSelects() {
    var driverId = '';
    DRIVER_SELECTS.some(function (id) {
      driverId = $(id).value;
      return !!driverId;
    });
    if (!driverId) return;
    DRIVER_SELECTS.forEach(function (id) {
      var select = $(id);
      var found = Array.prototype.some.call(select.options, function (option) {
        return option.value === driverId;
      });
      if (found) select.value = driverId;
    });
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

  /** 员工不开放的页面（菜单入口也隐藏） */
  var STAFF_HIDDEN_PAGES = { routes: true, drivers: true };

  /* ================= 页面 ================= */
  function switchPage(page) {
    if (!isManager() && STAFF_HIDDEN_PAGES[page]) {
      toast('员工模式无法查看该页面', 'error');
      return;
    }
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
    var tools = head.querySelector('.page-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.className = 'page-tools';
      head.appendChild(tools);
    }
    tools.insertBefore(box, tools.firstChild);
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

