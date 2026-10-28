/* 管理始发地 / 进港区 / 提还堆场 */
'use strict';

  /* ================= 配置管理弹窗 ================= */
  var cfgModalKey = null; // 当前编辑的 config key：origins / dest_in / dest_pick
  var cfgModalLabel = '';

  function openCfgModal(key) {
    cfgModalKey = key;
    cfgGroupAdding = false;
    if (key === 'origins') { cfgModalLabel = '始发地列表'; $('cfgHint').textContent = '行驶的起点，例如：新库、东库'; }
    else if (key === 'dest_in') { cfgModalLabel = '「进」的目的地'; $('cfgHint').textContent = '纯进或进段的目的地，例如：外五、洋山'; }
    else { cfgModalLabel = '「提 / 还 / 落」的目的地'; $('cfgHint').textContent = '「提」「还」「落」共用的空箱目的地，例如：洋山、沧海路'; }

    $('cfgModalTitle').textContent = cfgModalLabel;
    $('cfgNewInput').value = '';
    renderCfgTags();
    $('cfgModal').classList.remove('is-hidden');
    setTimeout(function () { $('cfgNewInput').focus(); }, 50);
  }

  function closeCfgModal() {
    $('cfgModal').classList.add('is-hidden');
    cfgModalKey = null;
  }

  /** 当前弹窗对应的分组字段：进 → dest_groups（固定三组）；提还 → dest_pick_groups（可增删） */
  function cfgGroupKey() {
    return cfgModalKey === 'dest_in' ? 'dest_groups' : 'dest_pick_groups';
  }

  /** 进目的地的分组固定，不允许新增/删除 */
  function cfgGroupsLocked() {
    return cfgModalKey === 'dest_in' || cfgModalKey === 'origins';
  }

  /** 把一个目的地移到指定分组 */
  function moveDestToGroup(destName, targetGroupId) {
    if (!destName) return;
    var groups = db.configs[cfgGroupKey()] || [];
    // 从所有组里移除
    groups.forEach(function (g) {
      g.members = (g.members || []).filter(function (m) { return m !== destName; });
    });
    // 加到目标组（__none__ 表示未分组，不加任何组）
    if (targetGroupId !== '__none__') {
      var target = groups.find(function (g) { return g.id === targetGroupId; });
      if (target) target.members.push(destName);
    }
    saveLocal();
    renderCfgTags();
    refreshCfgDependentUI();
  }
  function findDestGroup(dest) {
    var groups = db.configs[cfgGroupKey()] || [];
    for (var i = 0; i < groups.length; i++) {
      if ((groups[i].members || []).indexOf(dest) >= 0) return groups[i];
    }
    return null;
  }

  /** 名称排序键：中文按拼音比较，中文数字先转成阿拉伯数字，让「外一 / 外二 / 外四」按顺序排 */
  function cnSortKey(name) {
    var digits = { '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6', '七': '7', '八': '8', '九': '9' };
    return String(name == null ? '' : name).replace(/[一二三四五六七八九]/g, function (ch) { return digits[ch]; });
  }

  /** 按名称排序（中文按拼音，一/二/四/五 按数字） */
  function sortNamesByName(names) {
    return names.slice().sort(function (a, b) {
      return cnSortKey(a).localeCompare(cnSortKey(b), 'zh-CN');
    });
  }

  /** 是否正在显示「新增分组」的内联输入 */
  var cfgGroupAdding = false;
  /** 正在编辑公里数的分组 id（null 表示没展开） */
  var cfgKmEditingId = null;

  /** 分组公里按钮上的文字：没设过显示「公里」，设过显示数值 */
  function groupKmLabel(group) {
    var base = group && group.km ? Number(group.km['新库']) : 0;
    return base > 0 ? ('新库 ' + base) : '公里';
  }

  /** 点分组上的「公里」→ 展开新库 / 东库两个输入框 */
  function renderGroupKmEditor(group) {
    var km = group.km || {};
    var base = Number(km['新库']);
    var autoDong = '';
    if (isFinite(base) && base > 0) {
      autoDong = String(base + (isFarGroup(group) ? 10 : -10));
    }
    return '<div class="cfg-km-editor" data-km-group="' + esc(group.id) + '">' +
      '<label>新库 <input type="number" class="cfg-km-input" data-km-origin="新库" min="0" step="1" value="' +
        (isFinite(base) && base > 0 ? base : '') + '" placeholder="如 130"></label>' +
      '<label>东库 <input type="number" class="cfg-km-input" data-km-origin="东库" min="0" step="1" value="' +
        (Number(km['东库']) > 0 ? Number(km['东库']) : '') + '" placeholder="' +
        (autoDong ? '自动 ' + autoDong : '自动 ±10') + '"></label>' +
      '<button type="button" data-km-save="' + esc(group.id) + '">保存</button>' +
      '<button type="button" data-km-cancel="1">取消</button>' +
      '</div>';
  }

  /** 保存分组公里：东库留空表示按 ±10 自动推导 */
  function saveGroupKm(groupId) {
    var groups = db.configs[cfgGroupKey()] || [];
    var group = groups.filter(function (g) { return g.id === groupId; })[0];
    if (!group) return;
    var editor = document.querySelector('.cfg-km-editor[data-km-group="' + groupId + '"]');
    if (!editor) return;
    var baseInput = editor.querySelector('[data-km-origin="新库"]');
    var dongInput = editor.querySelector('[data-km-origin="东库"]');
    var base = parseFloat(baseInput && baseInput.value);
    var dong = parseFloat(dongInput && dongInput.value);

    if (!isFinite(base) || base <= 0) {
      // 新库留空 = 清掉这个分组的公里设定，回到「留空手填」
      delete group.km;
    } else {
      group.km = { '新库': round2(base) };
      if (isFinite(dong) && dong > 0) group.km['东库'] = round2(dong);
    }
    cfgKmEditingId = null;
    saveLocal();
    renderCfgTags();
    refreshCfgDependentUI();
    toast(group.km ? ('「' + group.label + '」公里已设为 ' + group.km['新库']) : ('「' + group.label + '」公里已清空'));
  }

  function createDestGroup(label) {
    if (cfgGroupsLocked()) return;
    label = String(label || '').trim();
    if (!label) { toast('请输入分组名称', 'error'); return; }
    var key = cfgGroupKey();
    var groups = db.configs[key] || (db.configs[key] = []);
    if (groups.some(function (g) { return g.label === label; })) {
      toast('分组名称已存在', 'error');
      return;
    }
    groups.push({
      id: 'zone-' + Date.now().toString(36) + Math.floor(Math.random() * 100).toString(36),
      label: label,
      desc: '',
      members: [],
      color: pickGroupColor(),
    });
    cfgGroupAdding = false;
    saveLocal();
    renderCfgTags();
    refreshCfgDependentUI();
    toast('已新增分组「' + label + '」');
  }

  function commitGroupRename(groupId, label) {
    var groups = db.configs[cfgGroupKey()] || [];
    var group = groups.filter(function (g) { return g.id === groupId; })[0];
    if (!group) return;
    label = String(label || '').trim();
    if (!label || label === group.label) { renderCfgTags(); return; }
    if (groups.some(function (g) { return g.id !== groupId && g.label === label; })) {
      toast('分组名称已存在', 'error');
      renderCfgTags();
      return;
    }
    group.label = label;
    saveLocal();
    renderCfgTags();
    refreshCfgDependentUI();
    toast('分组已改名为「' + label + '」');
  }

  /** 点 ✎ 后把分组名变成输入框，Enter 保存 / Esc 取消 */
  function startGroupRename(groupId) {
    var head = document.querySelector('.cfg-group[data-group-id="' + groupId + '"] .cfg-group-head');
    if (!head) return;
    var labelEl = head.querySelector('.cfg-group-label');
    if (!labelEl) return;
    var groups = db.configs[cfgGroupKey()] || [];
    var group = groups.filter(function (g) { return g.id === groupId; })[0];
    if (!group) return;

    var input = document.createElement('input');
    input.className = 'cfg-group-name-input';
    input.value = group.label;
    input.setAttribute('data-group-rename', groupId);
    head.replaceChild(input, labelEl);
    input.focus();
    input.select();

    var settled = false;
    var finish = function (save) {
      if (settled) return;
      settled = true;
      if (save) commitGroupRename(groupId, input.value);
      else renderCfgTags();
    };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', function () { finish(true); });
  }

  /** 删除分组（组内地点移到未分组） */
  function removeDestGroup(groupId) {
    if (cfgGroupsLocked()) return;
    var key = cfgGroupKey();
    var groups = db.configs[key] || [];
    var group = groups.filter(function (g) { return g.id === groupId; })[0];
    if (!group) return;
    var count = (group.members || []).length;
    if (!confirm('删除分组「' + group.label + '」？' +
      (count ? '组内 ' + count + ' 个地点会变为「未分组」，地点本身不会删除。' : '该分组为空。'))) return;
    db.configs[key] = groups.filter(function (g) { return g.id !== groupId; });
    saveLocal();
    renderCfgTags();
    refreshCfgDependentUI();
    toast('分组「' + group.label + '」已删除');
  }

  function renderCfgTags() {
    if (!cfgModalKey) return;
    var list = db.configs[cfgModalKey] || [];
    var html = '';

    if (cfgModalKey === 'origins') {
      // 始发地不分组
      list.forEach(function (name, idx) {
        html += renderCfgTag(name, idx);
      });
    } else {
      // 目的地：按区域分组显示（可拖拽分组）
      var groups = db.configs[cfgGroupKey()] || [];
      var locked = cfgGroupsLocked();
      var shown = {};
      groups.forEach(function (g, gi) {
        var members = (g.members || []).filter(function (m) { return list.indexOf(m) >= 0; });
        // 组内按名称排序，不按加入顺序
        members = sortNamesByName(members);
        html += '<div class="cfg-group" data-group-id="' + g.id + '">' +
          '<div class="cfg-group-head">' +
          '<i class="cfg-group-dot" style="background:' + groupColor(g, gi) + '"></i>' +
          '<span class="cfg-group-label">' + esc(g.label) + '</span>' +
          '<span class="cfg-group-desc">' + esc(g.desc || '') + '</span>' +
          '<span class="cfg-group-ops">' +
          '<button type="button" data-group-km="' + esc(g.id) + '" title="设置本组公里数" class="cfg-group-km-btn' +
            (g.km && Number(g.km['新库']) > 0 ? ' has-km' : '') + '">' + esc(groupKmLabel(g)) + '</button>' +
          '<button type="button" data-group-edit="' + esc(g.id) + '" title="修改分组名称">✎</button>' +
          (locked ? '' : '<button type="button" data-group-del="' + esc(g.id) + '" title="删除分组">×</button>') +
          '</span></div>' +
          (cfgKmEditingId === g.id ? renderGroupKmEditor(g) : '');
        members.forEach(function (name) {
          var idx = list.indexOf(name);
          if (idx >= 0) { html += renderCfgTag(name, idx); shown[name] = true; }
        });
        if (!members.length) html += '<div class="cfg-group-hint">拖目的地到这里归入此组</div>';
        html += '</div>';
      });
      // 新增分组：仅提还目的地可增删，进目的地固定三组
      if (!locked) {
        if (cfgGroupAdding) {
          html += '<div class="cfg-group-add is-open">' +
            '<input type="text" id="cfgGroupNewInput" maxlength="16" placeholder="新分组名称，例如 超外系">' +
            '<button type="button" data-group-create="1">确定</button>' +
            '<button type="button" data-group-cancel="1">取消</button>' +
            '</div>';
        } else {
          html += '<div class="cfg-group-add"><button type="button" data-group-add="1">＋ 新增分组</button></div>';
        }
      }
      // 未分组
      var ungrouped = list.filter(function (name) { return !shown[name]; });
      if (ungrouped.length || groups.length) {
        html += '<div class="cfg-group cfg-group-ungrouped" data-group-id="__none__">' +
          '<div class="cfg-group-head">未分组<span class="cfg-group-desc">拖到上方区域即归入</span></div>';
        ungrouped.forEach(function (name) {
          var idx = list.indexOf(name);
          if (idx >= 0) html += renderCfgTag(name, idx);
        });
        html += '</div>';
      }
    }
    $('cfgTags').innerHTML = html;
    // 打开新增分组表单时自动聚焦
    if (cfgModalKey !== 'origins' && cfgGroupAdding) {
      var addInput = document.getElementById('cfgGroupNewInput');
      if (addInput) addInput.focus();
    }
  }

  function renderCfgTag(name, idx) {
    var hasCoord = !!placeCoord(name);
    // 只有「始发地」保留地图定位按钮；进港区 / 提还堆场在管理弹窗里不设置坐标
    var coordBtn = cfgModalKey === 'origins' ?
      '<button type="button" data-cfg-coord="' + idx + '" class="' + (hasCoord ? 'has-coord' : '') +
      '" aria-label="设置坐标" title="' + (hasCoord ? '已设置坐标，点击修改' : '设置地图坐标') + '">📍</button>' : '';
    return '<span class="cfg-tag" draggable="true" data-cfg-name="' + esc(name) + '" data-cfg-idx="' + idx + '">' +
      esc(name) +
      coordBtn +
      '<button type="button" data-cfg-edit="' + idx + '" aria-label="编辑" title="改名">✎</button>' +
      '<button type="button" data-cfg-del="' + idx + '" aria-label="删除">×</button>' +
      '</span>';
  }

  /** 编辑改名 → 同步 routes 和 trips */
  function editCfgItem(idx) {
    if (!cfgModalKey) return;
    var list = db.configs[cfgModalKey] || [];
    var oldVal = list[idx];
    var newVal = prompt('修改名称：', oldVal);
    if (newVal === null) return;
    newVal = String(newVal).trim();
    if (!newVal || newVal === oldVal) return;
    if (list.indexOf(newVal) >= 0) {
      toast('该名称已存在', 'error');
      return;
    }
    list[idx] = newVal;

    // 同步到 routes
    db.routes.forEach(function (route) {
      if (!route.steps) return;
      if (cfgModalKey === 'origins') {
        if (route.origin === oldVal) route.origin = newVal;
      } else {
        route.steps.forEach(function (s) {
          if (s.dest === oldVal) s.dest = newVal;
        });
      }
    });

    // 同步坐标
    db.configs.coords = db.configs.coords || {};
    if (db.configs.coords[oldVal]) {
      db.configs.coords[newVal] = db.configs.coords[oldVal];
      delete db.configs.coords[oldVal];
    }

    // 同步两套分组里的成员名
    [db.configs.dest_groups, db.configs.dest_pick_groups].forEach(function (groupList) {
      (groupList || []).forEach(function (g) {
        g.members = (g.members || []).map(function (m) { return m === oldVal ? newVal : m; });
      });
    });

    // 同步 base_km 里的列名
    Object.keys(db.configs.base_km || {}).forEach(function (origin) {
      var row = db.configs.base_km[origin];
      if (row && row[oldVal] !== undefined) {
        row[newVal] = row[oldVal];
        delete row[oldVal];
      }
    });

    // 同步 trips 的 route_name（从 routes 重新拼，因为 route_name 是冗余快照）
    db.trips.forEach(function (trip) {
      var route = db.routes.find(function (r) { return r.id === trip.route_id; });
      if (route) trip.route_name = buildRouteName(route);
    });

    renderCfgTags();
    refreshCfgDependentUI();
    toast('已改名：' + oldVal + ' → ' + newVal);
  }

  /** 配置（始发地/目的地）变更后，实时刷新所有相关下拉，无需刷新网页 */
  function refreshCfgDependentUI() {
    saveLocal();

    // 保留趟次「直接搭建」里当前已选的动作/目的地（含尚未选目的地的新增行）
    var tripSteps = [];
    document.querySelectorAll('#tripBuildSteps .step-row').forEach(function (row) {
      var a = row.querySelector('[data-role="action"]');
      var d = row.querySelector('[data-role="dest"]');
      if (a && d) tripSteps.push({ action: a.value, dest: d.value });
    });
    renderTripBuildSteps(tripSteps);

    // 保留路线库里当前已选的动作/目的地
    var routeSteps = [];
    document.querySelectorAll('#stepsWrap .step-row').forEach(function (row) {
      var a = row.querySelector('[data-role="action"]');
      var d = row.querySelector('[data-role="dest"]');
      if (a && d) routeSteps.push({ action: a.value, dest: d.value });
    });
    renderStepsEditor(routeSteps);

    fillTripBuildOrigin();
    fillOriginSelect();
    fillRouteSelect();

    // 分组调整后地图同步（筛选条、右侧列表、标记颜色）
    if (typeof mapState !== 'undefined' && mapState && mapState.map) {
      renderMapFilters();
      renderMapPlaceList();
      renderMapMarkers(false);
    }
  }

  function addCfgItem() {
    if (!cfgModalKey) return;
    var input = $('cfgNewInput');
    var value = String(input.value || '').trim();
    if (!value) return;
    var list = db.configs[cfgModalKey] || [];
    if (list.indexOf(value) >= 0) {
      toast('已存在', 'error');
      return;
    }
    list.push(value);
    db.configs[cfgModalKey] = list;
    input.value = '';
    renderCfgTags();
    refreshCfgDependentUI();
    input.focus();
  }

  function countRoutesUsingCfg(key, value) {
    var count = 0;
    db.routes.forEach(function (route) {
      if (!route.steps) return;
      if (key === 'origins') {
        if (route.origin === value) count++;
      } else {
        route.steps.forEach(function (s) { if (s.dest === value) count++; });
      }
    });
    return count;
  }

  function removeCfgItem(idx) {
    if (!cfgModalKey) return;
    var list = db.configs[cfgModalKey] || [];
    var value = list[idx];
    var usage = countRoutesUsingCfg(cfgModalKey, value);
    if (usage > 0) {
      var label = cfgModalKey === 'origins' ? '始发地' : '目的地';
      var msg =
        '有 ' + usage + ' 条路线还在使用这个' + label + '，\n' +
        '删除后这些路线的数据不会丢失，但编辑时选不到该' + label + '。\n\n' +
        '确定要删除吗？';
      if (!confirm(msg)) return;
    }
    list.splice(idx, 1);
    db.configs[cfgModalKey] = list;
    // 从两套分组里一并移除，避免分组里残留已删除的地点
    [db.configs.dest_groups, db.configs.dest_pick_groups].forEach(function (groupList) {
      (groupList || []).forEach(function (g) {
        g.members = (g.members || []).filter(function (m) { return m !== value; });
      });
    });
    renderCfgTags();
    refreshCfgDependentUI();
  }

  function saveCfgModal() {
    refreshCfgDependentUI();
    closeCfgModal();
    renderRouteTable();
    toast(cfgModalLabel + '已保存');
  }


