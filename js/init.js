/* 初始化 / 月份 / 页面切换 */
'use strict';

  /* ================= 初始化 ================= */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
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

    refreshData();
    applyTripMode();
    renderPage();
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
    $('monthBox').classList.toggle('is-hidden', page === 'drivers' || page === 'routes' || page === 'attendance' || page === 'map');
    renderPage();
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


