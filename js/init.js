/* 初始化 / 月份 / 页面切换 */
'use strict';

  /* ================= 初始化 ================= */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
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
      renderPage();
    });
    $('monthPrev').addEventListener('click', function () {
      shiftMonth(-1);
    });
    $('monthNext').addEventListener('click', function () {
      shiftMonth(1);
    });

    $('settleRefresh').addEventListener('click', function () {
      loadDb();
      refreshData();
      renderPage();
      toast('数据已刷新');
    });
    $('exportBtn').addEventListener('click', exportExcel);

    $('tripForm').addEventListener('submit', saveTrip);
    $('tripRoute').addEventListener('change', syncRouteFields);
    $('tripModeSwitch').addEventListener('click', switchTripMode);
    $('tripBuildAddStep').addEventListener('click', addTripBuildStep);
    $('tripBuildOrigin').addEventListener('change', updateAutoTripKm);
    if ($('tripBuildSteps')) {
      $('tripBuildSteps').addEventListener('click', onTripBuildStepChange);
      $('tripBuildSteps').addEventListener('change', onTripBuildStepChange);
    }

    $('fuelForm').addEventListener('submit', saveFuel);

    $('driverForm').addEventListener('submit', saveDriver);
    $('driverCancel').addEventListener('click', resetDriverForm);

    $('routeForm').addEventListener('submit', saveRoute);
    $('routeCancel').addEventListener('click', resetRouteForm);
    $('routeSearch').addEventListener('input', renderRouteTable);
    $('routeSortBtn').addEventListener('click', function () {
      state.routeSort = state.routeSort === 'name' ? 'add' : 'name';
      renderRouteTable();
    });
    $('stepAddBtn').addEventListener('click', addStepRow);
    $('routeOrigin').addEventListener('change', updateRoutePreview);
    // 步骤编辑器事件委托（删除/动作切换）
    $('stepsWrap').addEventListener('click', onStepChange);
    $('stepsWrap').addEventListener('change', onStepChange);

    // 配置弹窗
    $('cfgOriginsBtn').addEventListener('click', function () { openCfgModal('origins'); });
    $('cfgDestInBtn').addEventListener('click', function () { openCfgModal('dest_in'); });
    $('cfgDestPickBtn').addEventListener('click', function () { openCfgModal('dest_pick'); });
    $('cfgModalClose').addEventListener('click', closeCfgModal);
    $('cfgModal').addEventListener('click', function (e) {
      if (e.target.id === 'cfgModal') closeCfgModal();
      // 分组：新增表单开关 / 确定 / 取消 / 改名 / 删除
      if (e.target.closest('[data-group-add]')) {
        e.stopPropagation();
        cfgGroupAdding = true;
        renderCfgTags();
        return;
      }
      if (e.target.closest('[data-group-create]')) {
        e.stopPropagation();
        var newGroupInput = document.getElementById('cfgGroupNewInput');
        createDestGroup(newGroupInput ? newGroupInput.value : '');
        return;
      }
      if (e.target.closest('[data-group-cancel]')) {
        e.stopPropagation();
        cfgGroupAdding = false;
        renderCfgTags();
        return;
      }
      var groupKm = e.target.closest('[data-group-km]');
      if (groupKm) {
        e.stopPropagation();
        var kmGroupId = groupKm.getAttribute('data-group-km');
        cfgKmEditingId = cfgKmEditingId === kmGroupId ? null : kmGroupId;
        renderCfgTags();
        return;
      }
      var kmSave = e.target.closest('[data-km-save]');
      if (kmSave) { e.stopPropagation(); saveGroupKm(kmSave.getAttribute('data-km-save')); return; }
      if (e.target.closest('[data-km-cancel]')) {
        e.stopPropagation();
        cfgKmEditingId = null;
        renderCfgTags();
        return;
      }
      var groupEdit = e.target.closest('[data-group-edit]');
      if (groupEdit) {
        e.stopPropagation();
        startGroupRename(groupEdit.getAttribute('data-group-edit'));
        return;
      }
      var groupDel = e.target.closest('[data-group-del]');
      if (groupDel) { e.stopPropagation(); removeDestGroup(groupDel.getAttribute('data-group-del')); return; }
      // 编辑 tag
      var editBtn = e.target.closest('[data-cfg-edit]');
      if (editBtn) { e.stopPropagation(); editCfgItem(Number(editBtn.dataset.cfgEdit)); return; }
      // 删除 tag
      var delBtn = e.target.closest('[data-cfg-del]');
      if (delBtn) { e.stopPropagation(); removeCfgItem(Number(delBtn.dataset.cfgDel)); return; }
      // 设置坐标
      var coordBtn = e.target.closest('[data-cfg-coord]');
      if (coordBtn) {
        e.stopPropagation();
        var coordList = db.configs[cfgModalKey] || [];
        var coordName = coordList[Number(coordBtn.dataset.cfgCoord)];
        if (coordName) openCoordModal(coordName);
      }
    });
    $('cfgAddBtn').addEventListener('click', addCfgItem);
    $('cfgNewInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addCfgItem(); }
    });
    // 新增分组输入框回车确认
    $('cfgModal').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var groupInput = e.target.closest('#cfgGroupNewInput');
      if (!groupInput) return;
      e.preventDefault();
      createDestGroup(groupInput.value);
    });
    $('cfgSaveBtn').addEventListener('click', saveCfgModal);

    // 目的地 / 始发地标签右键：坐标菜单（提/还目的地不需要定位）
    $('cfgTags').addEventListener('contextmenu', function (e) {
      if (cfgModalKey === 'dest_pick') return;
      var tag = e.target.closest('.cfg-tag');
      if (!tag) return;
      e.preventDefault();
      openMapMenu(tag.dataset.cfgName, e.clientX, e.clientY);
    });

    // 目的地标签跨区域拖拽
    $('cfgTags').addEventListener('dragstart', function (e) {
      var tag = e.target.closest('.cfg-tag[draggable="true"]');
      if (!tag) { e.preventDefault(); return; }
      e.dataTransfer.setData('text/plain', tag.dataset.cfgName);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(function () { tag.classList.add('dragging'); }, 0);
    });
    $('cfgTags').addEventListener('dragend', function (e) {
      var tag = e.target.closest('.cfg-tag');
      if (tag) tag.classList.remove('dragging');
      document.querySelectorAll('.cfg-group.drag-over').forEach(function (el) {
        el.classList.remove('drag-over');
      });
    });
    $('cfgTags').addEventListener('dragover', function (e) {
      var group = e.target.closest('.cfg-group');
      if (!group) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.cfg-group.drag-over').forEach(function (el) {
        if (el !== group) el.classList.remove('drag-over');
      });
      group.classList.add('drag-over');
    });
    $('cfgTags').addEventListener('dragleave', function (e) {
      var group = e.target.closest('.cfg-group');
      if (group) group.classList.remove('drag-over');
    });
    $('cfgTags').addEventListener('drop', function (e) {
      var group = e.target.closest('.cfg-group');
      if (!group) return;
      e.preventDefault();
      group.classList.remove('drag-over');
      var destName = e.dataTransfer.getData('text/plain');
      var targetGroupId = group.dataset.groupId; // 'zone-ab' / 'zone-cd' / 'zone-ys' / '__none__'
      if (targetGroupId) moveDestToGroup(destName, targetGroupId);
    });

    // 出勤登记
    $('attMonth').addEventListener('change', renderAttCalendar);
    $('attDriver').addEventListener('change', renderAttCalendar);

    // 地图
    $('mapFilters').addEventListener('change', function (e) {
      var input = e.target.closest('[data-map-filter]');
      if (!input) return;
      mapState.filter[input.dataset.mapFilter] = input.checked;
      renderMapFilters();
      renderMapPlaceList();
      renderMapMarkers(false);
    });
    $('mapPlaceList').addEventListener('click', function (e) {
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
        toast('「' + name + '」还没有坐标，右键选「在地图上点选」或「用弹窗精确设置」');
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
      openMapMenu(row.dataset.mapPlace, e.clientX, e.clientY);
    });

    // 右侧列表拖动：地点换组 / 分组排序
    $('mapPlaceList').addEventListener('dragstart', function (e) {
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

    $('backupBtn').addEventListener('click', exportBackup);
    $('restoreBtn').addEventListener('click', function () {
      $('restoreFile').click();
    });
    $('restoreFile').addEventListener('change', importBackup);

    document.addEventListener('click', handleRowAction);
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

    refreshData();
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
    $('monthSelect').value = value;
    renderPage();
  }

  function ensureMonth(dateString) {
    var month = String(dateString).slice(0, 7);
    if (!month || month === state.month) return;
    state.month = month;
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


