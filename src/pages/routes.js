/* ===== pages/routes.js ===== */
/* 线路价目页：结构 + 样式 + 逻辑都在这个文件里 */
'use strict';

definePage('routes', {
  html: `
    <div class="page-head">
      <div>
        <h2>线路价目</h2>
        <p class="sub">始发地 + 多段步骤（进/提），最多可 4 段。管理地点请到「目的地地图」页。</p>
      </div>
    </div>

    <form class="entry-card route-form" id="routeForm">
      <input type="hidden" id="routeId">
      <div class="field">
        <label>
          始发地
          <button type="button" class="btn btn-ghost mode-switch-btn" id="routeModeSwitch">切换为自定义</button>
        </label>
        <!-- 组合模式：从始发地库选 -->
        <select id="routeOrigin" required></select>
        <!-- 自定义模式：自由输入 -->
        <input type="text" id="routeOriginCustom" class="is-hidden" placeholder="自由输入始发地名称">
      </div>

      <div class="field field-wide">
        <label>行驶步骤</label>
        <div id="stepsWrap" class="steps-wrap"></div>
        <button type="button" class="btn btn-ghost step-add-btn" id="stepAddBtn">+ 添加步骤</button>
      </div>

      <div class="field">
        <label for="routeKm">总公里数</label>
        <input type="number" id="routeKm" step="0.1" min="0" placeholder="50" required>
      </div>
      <div class="field">
        <label for="routeCommission">总提成（元）</label>
        <input type="number" id="routeCommission" step="0.01" min="0" placeholder="10" required>
      </div>
      <div class="field field-submit">
        <button type="submit" class="btn btn-primary" id="routeSubmit">添加线路</button>
        <button type="button" class="btn btn-ghost is-hidden" id="routeCancel">取消</button>
      </div>

      <div class="route-preview" id="routePreview"></div>
    </form>

    <div class="table-card">
      <div class="table-head">
        <h3>线路列表</h3>
        <div class="table-tools">
          <input type="text" id="routeSearch" placeholder="搜索线路" autocomplete="off">
          <button type="button" class="btn btn-ghost" id="routeSortBtn" title="切换排序">按添加</button>
          <span class="table-sum" id="routeSummary"></span>
        </div>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>线路</th>
              <th class="num">总公里数</th>
              <th class="num">总提成（元）</th>
              <th class="op"></th>
            </tr>
          </thead>
          <tbody id="routeRows"></tbody>
        </table>
      </div>
    </div>

  `,

  css: `
/* ---------- 线路表单：步骤编辑器 ---------- */
.route-form {
  align-items: flex-start;
}

.steps-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.step-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f8fafd;
  border: 1px solid var(--line);
  border-radius: 9px;
}

.step-row .step-idx {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
}

.step-row select {
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
  cursor: pointer;
}

.step-row select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(42, 91, 224, 0.1);
}

.step-row select.step-action {
  width: 72px;
  flex-shrink: 0;
}

.step-row select.step-dest {
  flex: 1 1 auto;
  min-width: 140px;
}

/* 自定义模式：整个步骤区是一个 textarea */
.custom-route-text {
  width: 100%;
  min-height: 180px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #fff;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--ink);
  outline: none;
  resize: vertical;
}

.custom-route-text::placeholder {
  color: #9aa7bb;
  white-space: pre-line;
}

.custom-route-text:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(42, 91, 224, 0.1);
}

.step-row button.step-del {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--danger);
  font-size: 16px;
  line-height: 1;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.step-row button.step-del:hover {
  background: #fdeceb;
}

.step-add-btn {
  align-self: flex-start;
}

.route-preview {
  width: 100%;
  margin-top: 2px;
  padding: 10px 12px;
  background: var(--primary-soft);
  border: 1px dashed rgba(42, 91, 224, 0.35);
  border-radius: 9px;
  font-size: 13px;
  color: var(--primary);
  font-weight: 500;
  min-height: 20px;
}

/* ---------- 配置弹窗 ---------- */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 80;
}

.modal {
  width: 480px;
  max-width: 92vw;
  max-height: 80vh;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 24px 50px -18px rgba(16, 24, 40, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}

.modal-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.modal-close {
  width: 28px;
  height: 28px;
  border: 0;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  border-radius: 6px;
}

.modal-close:hover {
  background: #f3f6fb;
  color: var(--ink);
}

.modal-body {
  padding: 16px 18px;
  overflow-y: auto;
}

.cfg-hint {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 10px;
}

.cfg-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
  min-height: 36px;
  padding: 10px;
  background: #f8fafd;
  border: 1px solid var(--line);
  border-radius: 9px;
}

.cfg-input-row {
  display: flex;
  gap: 8px;
}

.cfg-input-row input {
  flex: 1 1 auto;
  height: 36px;
  padding: 0 11px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.cfg-input-row input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(42, 91, 224, 0.1);
}

.modal-foot {
  padding: 12px 18px;
  border-top: 1px solid var(--line);
  text-align: right;
}

.cfg-group {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #f7f8fa;
  border-radius: 6px;
  border: 1px solid #eee;
}

.cfg-group-head {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft);
  margin-bottom: 6px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.cfg-group-desc {
  font-weight: 400;
  font-size: 11px;
  color: #aaa;
}

.cfg-group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
  flex: 0 0 auto;
}

.cfg-group-ops {
  margin-left: auto;
  display: flex;
  gap: 2px;
  align-items: center;
}

.cfg-group-ops button {
  appearance: none;
  border: 0;
  background: transparent;
  color: #b3bcc9;
  font-family: inherit;
  font-size: 12px;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 4px;
  cursor: pointer;
}

.cfg-group-ops button:hover {
  color: var(--primary);
  background: #fff;
}

.cfg-group-ops button[data-group-del]:hover {
  color: var(--danger);
}

/* 分组公里：标题右侧的小按钮 + 展开的编辑行 */
.cfg-group-ops button.cfg-group-km-btn {
  width: auto;
  padding: 0 7px;
  font-size: 11px;
  color: var(--muted);
}

.cfg-group-ops button.cfg-group-km-btn.has-km {
  color: var(--primary);
  border-color: #b9cbff;
  background: var(--primary-soft);
  font-weight: 600;
}

.cfg-km-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin: 0 0 8px;
  background: #f8fafd;
  border: 1px solid #dbe4f2;
  border-radius: 6px;
  font-size: 12px;
  color: var(--muted);
}

.cfg-km-editor label {
  display: flex;
  align-items: center;
  gap: 5px;
}

.cfg-km-editor .cfg-km-input {
  width: 78px;
  height: 28px;
  padding: 0 7px;
  border: 1px solid var(--line);
  border-radius: 5px;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--ink);
  outline: none;
}

.cfg-km-editor .cfg-km-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(42, 91, 224, 0.12);
}

.cfg-km-editor button {
  appearance: none;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: #fff;
  color: var(--ink-soft);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}

.cfg-km-editor button[data-km-save] {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.cfg-group-add {
  margin-bottom: 12px;
}

.cfg-group-add button {
  appearance: none;
  width: 100%;
  padding: 9px 12px;
  border: 1px dashed #c8d2e2;
  border-radius: 6px;
  background: #fff;
  color: var(--ink-soft);
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;
}

.cfg-group-add button:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}

/* 新增分组的内联表单 */
.cfg-group-add.is-open {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.cfg-group-add.is-open input {
  flex: 1;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--primary);
  border-radius: 6px;
  font-family: inherit;
  font-size: 12.5px;
  outline: none;
  box-shadow: 0 0 0 3px rgba(42, 91, 224, 0.12);
}

.cfg-group-add.is-open button {
  width: auto;
  padding: 0 14px;
  border-style: solid;
  border-color: var(--primary);
}

.cfg-group-add.is-open button[data-group-cancel] {
  border-color: var(--line);
  color: var(--muted);
}

.cfg-group-add.is-open button[data-group-cancel]:hover {
  background: #f5f7fa;
  color: var(--ink-soft);
}

/* 分组改名输入框 */
.cfg-group-name-input {
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--primary);
  border-radius: 5px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink);
  outline: none;
  max-width: 150px;
}

.cfg-group.drag-over {
  background: var(--primary-soft);
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(37, 100, 235, 0.15);
}

.cfg-group-hint {
  font-size: 11px;
  color: #bbb;
  padding: 4px 0;
  font-style: italic;
}

.cfg-tag[draggable="true"] {
  cursor: grab;
}

.cfg-tag[draggable="true"].dragging {
  opacity: 0.4;
}

.cfg-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--primary-soft);
  color: var(--primary);
  border-radius: 16px;
  font-size: 12.5px;
  font-weight: 500;
}

.cfg-tag button {
  border: 0;
  background: transparent;
  color: var(--primary);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  padding: 0 0 0 2px;
}

.cfg-tag button[data-cfg-edit] {
  color: var(--muted);
  font-size: 11px;
  margin-right: 2px;
}

.cfg-tag button[data-cfg-edit]:hover {
  color: var(--primary);
}

.cfg-tag button[data-cfg-del]:hover {
  color: var(--danger);
}

.cfg-tag button[data-cfg-coord] {
  color: #98a2b3;
  font-size: 11px;
  margin-right: 2px;
}

.cfg-tag button[data-cfg-coord]:hover {
  color: var(--primary);
}

.cfg-tag button[data-cfg-coord].has-coord {
  color: #17a673;
}
  `,

  init: function () {
    state.routeMode = state.routeMode || 'combo';
    $('routeForm').addEventListener('submit', saveRoute);
    $('routeCancel').addEventListener('click', resetRouteForm);
    $('routeModeSwitch').addEventListener('click', toggleRouteMode);
    $('routeSearch').addEventListener('input', renderRouteTable);
    $('routeSortBtn').addEventListener('click', function () {
      state.routeSort = state.routeSort === 'name' ? 'add' : 'name';
      renderRouteTable();
    });
    $('stepAddBtn').addEventListener('click', addStepRow);
    $('routeOrigin').addEventListener('change', updateRoutePreview);
    $('routeOriginCustom').addEventListener('input', updateRoutePreview);
    // 自定义模式下 textarea 的 input 事件在 renderStepsEditor 里动态绑定
    // 步骤编辑器事件委托（删除/动作切换）
    $('stepsWrap').addEventListener('click', onStepChange);
    $('stepsWrap').addEventListener('change', onStepChange);

    applyRouteMode();

    // 配置弹窗
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
  },
});

/* ================= 线路：表单 / 步骤编辑器 / 列表 ================= */
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

/** 渲染步骤编辑器；steps 为空时自动加 1 段。
 * 组合模式：进/提 下拉 + 目的地下拉。
 * 自定义模式：一个 textarea，每行「动作 目的地」，回车换行。 */
function renderStepsEditor(steps) {
  var isCustom = state.routeMode === 'custom';
  var wrap = $('stepsWrap');
  if (isCustom) {
    var text = (steps || []).map(function (s) {
      return (s.action || '进') + ' ' + (s.dest || '');
    }).join('\n');
    wrap.innerHTML =
      '<textarea class="custom-route-text" data-role="customsteps"' +
      ' placeholder="每行一段，例如：\n进 洋山\n提 外一\n还 沧海路\n落 堆场A\n或者直接写目的地（默认按 进 处理）：\n洋山\n外一"' +
      '>' + esc(text) + '</textarea>';
    wrap.querySelector('[data-role="customsteps"]').addEventListener('input', updateRoutePreview);
    updateRoutePreview();
    return;
  }
  var list = steps && steps.length ? steps : [{ action: '进', dest: '' }];
  var html = '';
  list.forEach(function (step, idx) {
    var destHtml =
      '<select class="step-dest" data-role="dest">' +
        getDestOptionsGroupedHtml(step.action, step.dest) +
      '</select>';
    html +=
      '<div class="step-row" data-step-idx="' + idx + '">' +
      '<span class="step-idx">' + (idx + 1) + '</span>' +
      '<select class="step-action" data-role="action">' +
        '<option value="进"' + (step.action === '进' ? ' selected' : '') + '>进</option>' +
        '<option value="提"' + (step.action === '提' ? ' selected' : '') + '>提</option>' +
        '<option value="还"' + (step.action === '还' ? ' selected' : '') + '>还</option>' +
        '<option value="落"' + (step.action === '落' ? ' selected' : '') + '>落</option>' +
      '</select>' +
      destHtml +
      '<button type="button" class="step-del" data-role="del" title="删除此段">×</button>' +
      '</div>';
  });
  wrap.innerHTML = html;
  updateRoutePreview();
}

/** 解析自定义模式下 textarea 里的路线文本 */
function parseCustomRouteText(text) {
  var result = [];
  (text || '').split(/[\n\r]+/).forEach(function (line) {
    line = String(line).trim();
    if (!line) return;
    // 去掉开头序号或连字符（如 "1. 进 洋山" / "- 提 外一"）
    line = line.replace(/^\s*\d+[\.、]\s*/, '').replace(/^\s*[-·•]\s*/, '');
    // 动作关键字：进 / 提 / 还 / 落 / Pick / Leave ...
    var m = line.match(/^(进|提|还|落)[\s:：\-\.]+(.*)$/);
    var action = '进';
    var dest = line;
    if (m) {
      action = m[1];
      dest = m[2].trim();
    }
    if (dest) result.push({ action: action, dest: dest });
  });
  return result;
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

/** 从 DOM 收集当前 steps 值（自定义模式从 textarea 解析，组合模式从 select 取） */
function collectStepsFromDom() {
  if (state.routeMode === 'custom') {
    var ta = document.querySelector('#stepsWrap [data-role="customsteps"]');
    return parseCustomRouteText(ta ? ta.value : '');
  }
  var rows = document.querySelectorAll('#stepsWrap .step-row');
  var steps = [];
  rows.forEach(function (row) {
    var actionSel = row.querySelector('[data-role="action"]');
    var destSel = row.querySelector('[data-role="dest"]');
    if (actionSel && destSel && destSel.value.trim()) {
      steps.push({ action: actionSel.value, dest: destSel.value.trim() });
    }
  });
  return steps;
}

/** 取始发地（组合模式从 select 取，自定义模式从 input 取） */
function getCurrentOrigin() {
  if (state.routeMode === 'custom') {
    return $('routeOriginCustom').value.trim();
  }
  return $('routeOrigin').value;
}

/** 切换组合式 / 自定义 */
function toggleRouteMode() {
  state.routeMode = state.routeMode === 'custom' ? 'combo' : 'custom';
  applyRouteMode();
  // 收集当前步骤再重渲染，保留已有内容
  var steps = collectStepsFromDom();
  renderStepsEditor(steps);
  toast(state.routeMode === 'custom' ? '已切换为自定义模板，自动计算公里/提成将停用' : '已切换为组合式');
}

function applyRouteMode() {
  var isCustom = state.routeMode === 'custom';
  $('routeModeSwitch').textContent = isCustom ? '切换为组合式' : '切换为自定义';
  $('routeOrigin').classList.toggle('is-hidden', isCustom);
  $('routeOriginCustom').classList.toggle('is-hidden', !isCustom);
  $('routeOrigin').required = !isCustom;
  $('routeOriginCustom').required = isCustom;
  $('stepAddBtn').classList.toggle('is-hidden', isCustom);
  // 自定义模式下把 select 当前值带给 input，方便用户直接改
  if (isCustom && !$('routeOriginCustom').value) {
    $('routeOriginCustom').value = $('routeOrigin').value;
  }
}

/** 路线库：始发地/步骤变化时自动填总公里（自定义模式跳过自动计算，全程手填） */
function updateAutoRouteKm() {
  var origin = getCurrentOrigin();
  var steps = collectStepsFromDom();
  if (state.routeMode === 'custom') {
    // 自定义模式停用自动计算，只更新预览
    updateRoutePreviewOnly(origin, steps);
    return;
  }
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

/** 只更新预览，不触发公里/提成重算（自定义模式用） */
function updateRoutePreviewOnly(origin, steps) {
  var parts = [];
  if (origin) parts.push(origin);
  steps.forEach(function (s) { parts.push(s.action + s.dest); });
  var preview = parts.length ? parts.join(' → ') : '预览：始发地 + 步骤后自动拼接';
  $('routePreview').textContent = preview;
}

function updateRoutePreview() {
  var origin = getCurrentOrigin();
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
    // 自定义模式切动作不重置目的地（用户自己填的），也不重算公里
    if (state.routeMode !== 'custom') {
      var row = target.closest('.step-row');
      var destSel = row.querySelector('[data-role="dest"]');
      if (destSel) destSel.innerHTML = getDestOptionsGroupedHtml(target.value, destSel.value || '');
    }
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
    var origin = getCurrentOrigin();
    if (!origin) throw new Error('请填写始发地');
    if (!steps.length) throw new Error('请至少添加一段行驶步骤');
    var payload = {
      origin: origin,
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
  // origin 是否在始发地库里 → 决定默认用哪种模式打开
  var origins = db.configs.origins || [];
  var inLibrary = origins.indexOf(route.origin) >= 0;
  state.routeMode = inLibrary ? 'combo' : 'custom';
  applyRouteMode();
  if (state.routeMode === 'custom') {
    $('routeOriginCustom').value = route.origin;
    $('routeOrigin').value = '';
  } else {
    $('routeOrigin').value = route.origin;
    $('routeOriginCustom').value = '';
  }
  $('routeKm').value = route.total_km;
  $('routeCommission').value = route.total_commission;
  renderStepsEditor(route.steps);
  $('routeSubmit').textContent = '保存修改';
  $('routeCancel').classList.remove('is-hidden');
  (state.routeMode === 'custom' ? $('routeOriginCustom') : $('routeOrigin')).focus();
}

function resetRouteForm() {
  $('routeId').value = '';
  $('routeForm').reset();
  $('routeKm').value = '';
  $('routeCommission').value = '';
  $('routeOriginCustom').value = '';
  fillOriginSelect();
  renderStepsEditor([]);
  $('routeSubmit').textContent = '添加线路';
  $('routeCancel').classList.add('is-hidden');
  applyRouteMode();
}

/* ================= 管理始发地 / 进港区 / 提还堆场（配置弹窗） ================= */
var cfgModalKey = null; // 当前编辑的 config key：origins / dest_in / dest_pick
var cfgModalLabel = '';

function openCfgModal(key) {
  if (!requireManager('管理地点')) return;
  cfgModalKey = key;
  cfgGroupAdding = false;
  if (key === 'origins') { cfgModalLabel = '始发地列表'; $('cfgHint').textContent = '行驶的起点，例如：新库、东库'; }
  else if (key === 'dest_in') { cfgModalLabel = '「进」的目的地'; $('cfgHint').textContent = '纯进或进段的目的地，例如：外五、洋山'; }
  else { cfgModalLabel = '「提 / 还 / 落」的目的地'; $('cfgHint').textContent = '「提」「还」「落」共用的空箱目的地，例如：洋山、沧海路'; }

  $('cfgModalTitle').textContent = cfgModalLabel;
  $('cfgNewInput').value = '';
  refreshCfgSuggestList();
  renderCfgTags();
  $('cfgModal').classList.remove('is-hidden');
  setTimeout(function () { $('cfgNewInput').focus(); }, 50);
}

/** 刷新输入框的候选提示（datalist），打开弹窗 / 添加成功后调用 */
function refreshCfgSuggestList() {
  var list = db.configs[cfgModalKey] || [];
  var datalist = $('cfgSuggestList');
  if (!datalist) return;
  datalist.innerHTML = list.map(function (item) {
    return '<option value="' + esc(item) + '">';
  }).join('');
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
  if (!requireManager('调整分组')) return;
  if (!destName) return;
  var groups = db.configs[cfgGroupKey()] || [];
  // 从所有组里移除
  groups.forEach(function (g) {
    g.members = (g.members || []).filter(function (m) { return m !== destName; });
  });
  // 另一个弹窗那套分组里的同名残留也清掉（只清「不属于那一侧」的，避免影响真正两处都有的地点）
  var isInDest = (db.configs.dest_in || []).indexOf(destName) >= 0;
  var isPickDest = (db.configs.dest_pick || []).indexOf(destName) >= 0;
  if (cfgGroupKey() === 'dest_pick_groups' && !isInDest) {
    (db.configs.dest_groups || []).forEach(function (g) {
      g.members = (g.members || []).filter(function (m) { return m !== destName; });
    });
  }
  if (cfgGroupKey() === 'dest_groups' && !isPickDest) {
    (db.configs.dest_pick_groups || []).forEach(function (g) {
      g.members = (g.members || []).filter(function (m) { return m !== destName; });
    });
  }
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
  if (!requireManager('修改分组公里')) return;
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
  if (!requireManager('新增分组')) return;
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
  if (!requireManager('修改分组名称')) return;
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
  if (!requireManager('删除分组')) return;
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
          '<input type="text" id="cfgGroupNewInput" maxlength="16" placeholder="新分组名称，例如 临港系">' +
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
  // 管理弹窗里不再提供"设置坐标"入口——坐标在地图页单独设置
  var coordBtn = '';
  return '<span class="cfg-tag" draggable="true" data-cfg-name="' + esc(name) + '" data-cfg-idx="' + idx + '">' +
    esc(name) +
    coordBtn +
    '<button type="button" data-cfg-edit="' + idx + '" aria-label="编辑" title="改名">✎</button>' +
    '<button type="button" data-cfg-del="' + idx + '" aria-label="删除">×</button>' +
    '</span>';
}

/** 编辑改名 → 同步 routes 和 trips */
function editCfgItem(idx) {
  if (!requireManager('修改地点名称')) return;
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

  // 分组调整后地图同步（筛选条、右侧列表、标记颜色）
  if (typeof mapState !== 'undefined' && mapState && mapState.map) {
    renderMapFilters();
    renderMapPlaceList();
    renderMapMarkers(false);
  }
}

function addCfgItem() {
  if (!requireManager('新增地点')) return;
  if (!cfgModalKey) return;
  var input = $('cfgNewInput');
  var value = String(input.value || '').trim();
  if (!value) return;
  var list = db.configs[cfgModalKey] || [];
  // 重复检查（精确匹配，trim 后比对）
  if (list.indexOf(value) >= 0) {
    toast('「' + value + '」已存在，不能重复添加', 'error');
    input.select();
    return;
  }
  list.push(value);
  db.configs[cfgModalKey] = list;
  input.value = '';
  renderCfgTags();
  refreshCfgSuggestList();
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
  if (!requireManager('删除地点')) return;
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
  if (!requireManager('保存地点管理')) return;
  refreshCfgDependentUI();
  closeCfgModal();
  renderRouteTable();
  toast(cfgModalLabel + '已保存');
}

