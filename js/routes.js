/* 线路价目 */
'use strict';

  /* ================= 线路 UI ================= */
  function fillOriginSelect() {
    var select = $('routeOrigin');
    var current = select.value;
    var html = '<option value="">请选择始发地</option>';
    (db.configs.origins || []).forEach(function (name) {
      html += '<option value="' + esc(name) + '">' + esc(name) + '</option>';
    });
    select.innerHTML = html;
    if ((db.configs.origins || []).indexOf(current) >= 0) select.value = current;
  }

  /** 渲染步骤编辑器；steps 为空时自动加 1 段 */
  function renderStepsEditor(steps) {
    var list = steps && steps.length ? steps : [{ action: '进', dest: '' }];
    var wrap = $('stepsWrap');
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
        '<button type="button" class="step-del" data-role="del" title="删除此段">×</button>' +
        '</div>';
    });
    wrap.innerHTML = html;
    updateRoutePreview();
  }

  function getDestOptionsForAction(action) {
    // 「提」「还」「落」共用同一份提空箱目的地
    if (action === '提' || action === '还' || action === '落') return db.configs.dest_pick || [];
    return db.configs.dest_in || [];
  }

  /** 生成带 <optgroup> 的目的地下拉 HTML，按区域分组 */
  function getDestOptionsGroupedHtml(action, currentVal) {
    var flat = getDestOptionsForAction(action);
    // 「进」用进分组，「提 / 还 / 落」用提还分组
    var groups = (action === '提' || action === '还' || action === '落')
      ? (db.configs.dest_pick_groups || [])
      : (db.configs.dest_groups || []);
    var shown = {};
    var html = '<option value="">请选目的地</option>';
    groups.forEach(function (g) {
      var members = (g.members || []).filter(function (m) { return flat.indexOf(m) >= 0; });
      if (!members.length) return;
      html += '<optgroup label="' + esc(g.label) + '">';
      members.forEach(function (name) {
        var sel = name === currentVal ? ' selected' : '';
        html += '<option value="' + esc(name) + '"' + sel + '>' + esc(name) + '</option>';
        shown[name] = true;
      });
      html += '</optgroup>';
    });
    var ungrouped = flat.filter(function (name) { return !shown[name]; });
    if (ungrouped.length) {
      html += '<optgroup label="其他">';
      ungrouped.forEach(function (name) {
        var sel = name === currentVal ? ' selected' : '';
        html += '<option value="' + esc(name) + '"' + sel + '>' + esc(name) + '</option>';
      });
      html += '</optgroup>';
    }
    return html;
  }

  /** 从 DOM 收集当前 steps 值 */
  function collectStepsFromDom() {
    var rows = document.querySelectorAll('#stepsWrap .step-row');
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

  /** 路线库：始发地/步骤变化时自动填总公里 */
  function updateAutoRouteKm() {
    var origin = $('routeOrigin').value;
    var steps = collectStepsFromDom();
    if (origin && steps.length) {
      var autoKm = computeAutoKm(origin, steps);
      // 自定义分组没有公里规则 → 留空，手填
      $('routeKm').value = (autoKm === null ? '' : autoKm);
    }
    // 同步自动提成
    var autoComm = computeAutoCommission(steps);
    var currentComm = parseFloat($('routeCommission').value);
    if (!currentComm || currentComm === state._lastRouteAutoCommission) {
      $('routeCommission').value = autoComm;
    }
    state._lastRouteAutoCommission = autoComm;
  }

  function updateRoutePreview() {
    var origin = $('routeOrigin').value;
    var steps = collectStepsFromDom();
    var parts = [];
    if (origin) parts.push(origin);
    steps.forEach(function (s) { parts.push(s.action + s.dest); });
    var preview = parts.length ? parts.join(' → ') : '预览：始发地 + 步骤后自动拼接';
    $('routePreview').textContent = preview;
    updateAutoRouteKm();
  }

  function addStepRow() {
    var existing = collectStepsFromDom();
    if (existing.length >= 4) {
      toast('最多 4 段', 'error');
      return;
    }
    existing.push({ action: '提', dest: '' });
    renderStepsEditor(existing);
    updateAutoRouteKm();
  }

  function onStepChange(event) {
    var target = event.target;
    if (target.matches('[data-role="action"]')) {
      var row = target.closest('.step-row');
      var destSel = row.querySelector('[data-role="dest"]');
      destSel.innerHTML = getDestOptionsGroupedHtml(target.value, '');
    } else if (target.matches('[data-role="del"]')) {
      var idx = Number(target.closest('.step-row').dataset.stepIdx);
      var steps = collectStepsFromDom();
      steps.splice(idx, 1);
      if (!steps.length) steps.push({ action: '进', dest: '' });
      renderStepsEditor(steps);
      updateRoutePreview();
      return;
    }
    // 目的地选择等其他变化 → 重算预览+公里
    updateRoutePreview();
  }

  function renderRouteTable() {
    var keyword = $('routeSearch').value.trim().toLowerCase();
    var routes = db.routes.filter(function (route) {
      var name = buildRouteName(route);
      return !keyword || name.toLowerCase().indexOf(keyword) >= 0;
    });
    // 排序
    if (state.routeSort === 'name') {
      routes.sort(function (a, b) {
        return buildRouteName(a).localeCompare(buildRouteName(b), 'zh-CN');
      });
    } else {
      routes.sort(function (a, b) { return a.id - b.id; });
    }
    $('routeSortBtn').textContent = state.routeSort === 'name' ? '按名称' : '按添加';

    var tbody = $('routeRows');
    $('routeSummary').textContent = keyword
      ? '匹配 ' + routes.length + ' / ' + db.routes.length + ' 条'
      : '共 ' + db.routes.length + ' 条线路';

    if (!routes.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="empty-cell">' +
        (db.routes.length ? '没有匹配的线路' : '还没有线路，请在上方添加') +
        '</td></tr>';
      return;
    }

    tbody.innerHTML = routes
      .map(function (route) {
        return (
          '<tr><td class="route-name">' + esc(buildRouteName(route)) + '</td>' +
          '<td class="num">' + fmt2(route.total_km) + '</td>' +
          '<td class="num">' + yuan(route.total_commission) + '</td>' +
          '<td class="op">' +
          '<button type="button" class="link" data-edit-route="' + route.id + '">编辑</button>' +
          '<button type="button" class="link-danger" data-del-route="' + route.id + '">删除</button>' +
          '</td></tr>'
        );
      })
      .join('');
  }

  function saveRoute(event) {
    event.preventDefault();
    try {
      var id = Number($('routeId').value);
      var steps = collectStepsFromDom();
      var payload = {
        origin: $('routeOrigin').value,
        steps: steps,
        total_km: $('routeKm').value,
        total_commission: $('routeCommission').value,
      };
      if (id) {
        updateRoute(id, payload);
        toast('线路已更新');
      } else {
        addRoute(payload);
        toast('线路已添加');
      }
      resetRouteForm();
      refreshData();
      renderPage();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function editRoute(id) {
    var route = db.routes.find(function (item) {
      return item.id === id;
    });
    if (!route) return;
    // 旧格式 route 无 steps
    if (!Array.isArray(route.steps)) {
      toast('这是旧格式线路，请重新新建一条', 'error');
      return;
    }
    $('routeId').value = route.id;
    fillOriginSelect();
    $('routeOrigin').value = route.origin;
    $('routeKm').value = route.total_km;
    $('routeCommission').value = route.total_commission;
    renderStepsEditor(route.steps);
    $('routeSubmit').textContent = '保存修改';
    $('routeCancel').classList.remove('is-hidden');
    $('routeOrigin').focus();
  }

  function resetRouteForm() {
    $('routeId').value = '';
    $('routeForm').reset();
    $('routeKm').value = '';
    $('routeCommission').value = '';
    fillOriginSelect();
    renderStepsEditor([]);
    $('routeSubmit').textContent = '添加线路';
    $('routeCancel').classList.add('is-hidden');
  }


