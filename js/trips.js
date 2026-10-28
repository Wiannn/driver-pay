/* 趟次录入 + 表格行内编辑 */
'use strict';

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

  function renderTrips() {
    var month = state.month;
    var driverId = $('tripDriver').value;
    var monthRows = db.trips.filter(function (item) {
      return String(item.date).slice(0, 7) === month;
    });
    var rows = (driverId
      ? monthRows.filter(function (item) {
          return String(item.driver_id) === String(driverId);
        })
      : monthRows
    ).sort(function (a, b) {
      return b.date.localeCompare(a.date) || b.id - a.id;
    });

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

    // 分页：每页固定 15 条
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
          '<td class="container-no" data-trip="' + trip.id + '" title="双击编辑 · 仅字母数字">' +
            esc(trip.container_no || '') + '</td>' +
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
  }

  function gotoTripPage(page) {
    state.tripPage = page;
    renderTrips();
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

  /** 双击箱号单元格 → 内联编辑（仅允许字母和数字） */
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
    input.placeholder = '仅字母数字';
    // 输入时实时过滤（只保留 A-Z a-z 0-9）
    input.addEventListener('input', function () {
      var cleaned = input.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (cleaned !== input.value) {
        input.value = cleaned;
      }
    });

    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();

    function finish() {
      var v = input.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
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


