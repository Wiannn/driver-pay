/* ===== pages/attendance.js ===== */
/* 出勤登记页：结构 + 事件 + 逻辑都在这个文件里 */
'use strict';

definePage('attendance', {
  html: `
    <div class="page-head">
      <div>
        <h2>出勤登记</h2>
        <p class="sub">明确登记每位司机每一天的状态（正常上班 / 休息 / 台风）。结算时的「上班天数」以此为准，路线记录作为补充对照。</p>
      </div>
    </div>

    <div class="attendance-controls">
      <div class="attendance-control">
        <label for="attMonth">月份</label>
        <input type="month" id="attMonth" required>
      </div>
      <div class="attendance-control">
        <label for="attDriver">司机</label>
        <select id="attDriver" required></select>
      </div>
      <div class="attendance-legend">
        <span class="legend-item"><i class="dot dot-work"></i>正常</span>
        <span class="legend-item"><i class="dot dot-rest"></i>休息</span>
        <span class="legend-item"><i class="dot dot-weather"></i>台风</span>
        <span class="legend-item"><i class="dot dot-empty"></i>未登记</span>
      </div>
      <div class="attendance-control att-lock-ctrl">
        <button type="button" class="btn btn-primary" id="attConfirmBtn">确认本月考勤</button>
        <span class="att-lock-note" id="attLockNote"></span>
      </div>
    </div>

    <div class="attendance-stats" id="attStats"></div>

    <div class="calendar-wrap" id="calendarWrap"></div>
  `,

  css: `
.attendance-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 14px 18px; margin-bottom: 12px; }
.attendance-control label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.attendance-control input, .attendance-control select { height: 32px; padding: 0 9px; border: 1px solid var(--line); border-radius: 8px; background: #fff; font-family: inherit; font-size: 13px; outline: none; min-width: 140px; }
.attendance-control input:focus, .attendance-control select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(42, 91, 224, 0.1); }
.attendance-legend { display: flex; gap: 14px; margin-left: auto; align-items: center; }
.att-lock-ctrl { display: flex; align-items: center; gap: 10px; }
.att-lock-ctrl .btn { height: 32px; padding: 0 14px; font-size: 13px; }
.att-lock-ctrl .btn:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
.att-lock-note { font-size: 12px; color: var(--muted); white-space: nowrap; }
.att-lock-note.is-locked { color: #0a8f5c; font-weight: 600; }
.calendar-wrap.is-locked .cal-cell { cursor: default; }
.calendar-wrap.is-locked .cal-cell:hover { transform: none; box-shadow: none; }
.legend-item { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--muted); }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot-work { background: #0a8f5c; }
.dot-rest { background: #2a5be0; }
.dot-weather { background: #c2410c; }
.dot-empty { background: #e5e7eb; border: 1px dashed #cbd5e1; }
.attendance-stats { display: flex; gap: 12px; margin-bottom: 12px; font-size: 13px; color: var(--ink); }
.attendance-stats .stat-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 14px; background: #f3f6fb; }
.attendance-stats .stat-pill strong { color: #0a8f5c; font-weight: 600; }
.attendance-stats .stat-pill.rest strong { color: #2a5be0; }
.attendance-stats .stat-pill.weather strong { color: #c2410c; }
.calendar-wrap { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 8px; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.calendar-head { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 3px; }
.calendar-head div { text-align: center; font-size: 11px; font-weight: 600; color: var(--muted); padding: 2px 0; }
.cal-cell { position: relative; height: 46px; border-radius: 5px; border: 1px solid var(--line); background: #fff; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 12px; font-weight: 500; line-height: 1; transition: transform 0.1s, box-shadow 0.1s; user-select: none; }
.cal-cell:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(16, 24, 40, 0.12); }
.cal-cell.work { background: rgba(10, 143, 92, 0.1); border-color: rgba(10, 143, 92, 0.4); }
.cal-cell.rest { background: rgba(42, 91, 224, 0.1); border-color: rgba(42, 91, 224, 0.4); }
.cal-cell.weather { background: rgba(194, 65, 12, 0.1); border-color: rgba(194, 65, 12, 0.4); }
.cal-cell.none { background: #f9fafc; }
.cal-cell.other-month { opacity: 0.25; cursor: default; background: transparent; }
.cal-cell.other-month:hover { transform: none; box-shadow: none; }
.cal-day { font-size: 15px; font-weight: 600; line-height: 1; }
.cal-cell.work .cal-day { color: #0a8f5c; }
.cal-cell.rest .cal-day { color: #2a5be0; }
.cal-cell.weather .cal-day { color: #c2410c; }
.cal-status { font-size: 10px; line-height: 1; padding: 1px 4px; border-radius: 3px; font-weight: 500; }
.cal-cell.none .cal-status { color: #bcc6d3; }
.cal-cell.work .cal-status { background: rgba(10,143,92,0.18); color: #0a8f5c; }
.cal-cell.rest .cal-status { background: rgba(42,91,224,0.18); color: #2a5be0; }
.cal-cell.weather .cal-status { background: rgba(194,65,12,0.18); color: #c2410c; }
.cal-trip-mini { position: absolute; bottom: 2px; right: 3px; font-size: 10px; color: var(--muted); max-width: 90%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 4px; }
  `,

  init: function () {
    $('attMonth').addEventListener('change', renderAttCalendar);
    $('attDriver').addEventListener('change', renderAttCalendar);
    $('attConfirmBtn').addEventListener('click', confirmAttMonth);

    // 月历格子点击委托
    $('calendarWrap').addEventListener('click', function (e) {
      var cell = e.target.closest('.cal-cell[data-date]');
      if (!cell) return;
      if (cell.classList.contains('other-month')) return;
      toggleAttendance(cell.dataset.date);
    });
  },
});

var ATT_STATUS = { work: '正常', rest: '休息', weather: '台风' };
var ATT_STATUS_CYCLE = ['work', 'rest', 'weather']; // 点击循环顺序

/** 某司机某月的确认锁：返回确认日期字符串，未确认返回 '' */
function attLockOf(driverId, month) {
  var locks = (db.configs && db.configs.att_locks) || {};
  return locks[driverId + '|' + month] || '';
}

/** 写入确认锁；员工模式返回 false */
function setAttLock(driverId, month, stamp) {
  if (!isManager()) {
    toast('员工模式无法确认考勤', 'error');
    return false;
  }
  if (!db.configs.att_locks) db.configs.att_locks = {};
  db.configs.att_locks[driverId + '|' + month] = stamp;
  return true;
}

/** 当月还没有选状态的日子 */
function attMissingDays(driverId, month) {
  var totalDays = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  var filled = {};
  db.attendance.forEach(function (a) {
    if (a.driver_id === driverId && String(a.date).slice(0, 7) === month) filled[String(a.date)] = true;
  });
  var missing = [];
  for (var d = 1; d <= totalDays; d++) {
    var ds = month + '-' + String(d).padStart(2, '0');
    if (!filled[ds]) missing.push(d);
  }
  return missing;
}

/** 同步「确认本月考勤」按钮与提示文字 */
function syncAttLockUi(driverId, month) {
  var btn = $('attConfirmBtn');
  var note = $('attLockNote');
  if (!driverId || !month) {
    btn.disabled = true;
    btn.textContent = '确认本月考勤';
    note.textContent = '';
    note.classList.remove('is-locked');
    return;
  }
  var lock = attLockOf(driverId, month);
  btn.disabled = !!lock;
  btn.textContent = lock ? '本月已确认' : '确认本月考勤';
  if (lock) {
    note.textContent = '已于 ' + lock + ' 锁定，不可修改';
    note.classList.add('is-locked');
  } else {
    var missing = attMissingDays(driverId, month).length;
    note.textContent = missing ? '还有 ' + missing + ' 天未选状态' : '全部已选，可确认';
    note.classList.remove('is-locked');
  }
}

/** 确认本月考勤：每天都有状态才允许，确认后该司机该月锁定 */
function confirmAttMonth() {
  var month = $('attMonth').value;
  var driverId = Number($('attDriver').value);
  if (!month || !driverId) { toast('请先选择月份和司机', 'error'); return; }
  if (attLockOf(driverId, month)) return;

  var missing = attMissingDays(driverId, month);
  if (missing.length) {
    toast('还有 ' + missing.length + ' 天未选状态（' + missing.slice(0, 6).join('、') +
      (missing.length > 6 ? ' 等' : '') + '），补齐后才能确认', 'error');
    return;
  }

  var driver = db.drivers.filter(function (d) { return d.id === driverId; })[0];
  var name = driver ? driver.name : '该司机';
  if (!confirm('确认后 ' + name + ' ' + month + ' 的考勤将锁定，不能再修改。\n\n确定现在确认吗？')) return;

  var now = new Date();
  var ok = setAttLock(driverId, month, now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'));
  if (!ok) return;
  saveLocal();
  renderAttCalendar();
  toast('已确认，' + month + ' 考勤已锁定');
}

function fillAttDriverSelect() {
  var select = $('attDriver');
  var current = select.value;
  var html = '<option value="">请选择司机</option>';
  db.drivers.forEach(function (d) {
    html += '<option value="' + d.id + '">' + esc(d.name) + ' · ' + esc(d.plate) + '</option>';
  });
  select.innerHTML = html;
  if (current && db.drivers.some(function (d) { return String(d.id) === current; })) {
    select.value = current;
  }
}

/** 渲染月历：给定月份(YYYY-MM)和司机ID */
function renderAttCalendar() {
  var month = $('attMonth').value;
  var driverId = Number($('attDriver').value);
  if (!month || !driverId) {
    $('calendarWrap').innerHTML = '<div class="empty-cell" style="padding:24px">请先选择月份和司机</div>';
    $('calendarWrap').classList.remove('is-locked');
    $('attStats').innerHTML = '';
    syncAttLockUi('', '');
    return;
  }

  // 解析月份
  var parts = month.split('-');
  var year = Number(parts[0]);
  var monthIdx = Number(parts[1]) - 1;
  var firstDay = new Date(year, monthIdx, 1);
  var lastDay = new Date(year, monthIdx + 1, 0);
  var startWeekday = firstDay.getDay(); // 0=周日
  startWeekday = startWeekday === 0 ? 7 : startWeekday; // 1=周一 7=周日
  var totalDays = lastDay.getDate();

  // 构建 calendar matrix (6行 x 7列)
  var cells = [];
  // 上月尾部
  var prevMonthLast = new Date(year, monthIdx, 0).getDate();
  for (var i = startWeekday - 1; i > 0; i--) {
    cells.push({ day: prevMonthLast - i + 1, other: true });
  }
  // 当月
  for (var d = 1; d <= totalDays; d++) {
    cells.push({ day: d, other: false, date: month + '-' + String(d).padStart(2, '0') });
  }
  // 下月头部凑齐 6x7=42
  while (cells.length < 42) {
    cells.push({ day: cells.length - 35, other: true });
  }

  // 查出勤登记
  var attMap = {};
  db.attendance.forEach(function (a) {
    if (a.driver_id === driverId && String(a.date).slice(0, 7) === month) {
      attMap[String(a.date)] = a;
    }
  });

  // 查该司机本月的 trip 记录
  var tripsMap = {};
  db.trips.forEach(function (t) {
    if (t.driver_id === driverId && String(t.date).slice(0, 7) === month) {
      if (!tripsMap[t.date]) tripsMap[t.date] = [];
      tripsMap[t.date].push(t);
    }
  });

  // 渲染表头 + 格子
  var head = '<div class="calendar-head"><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div><div>日</div></div>';
  var body = '<div class="calendar-grid">';
  cells.forEach(function (c) {
    if (c.other) {
      body += '<div class="cal-cell other-month">' + c.day + '</div>';
    } else {
      var att = attMap[c.date];
      var status = att ? att.status : 'none';
      var trips = tripsMap[c.date] || [];
      var tip = c.date;
      if (att) tip += ' · ' + ATT_STATUS[att.status];
      if (trips.length) tip += ' · ' + trips.length + '趟';
      body +=
        '<div class="cal-cell ' + status + '" data-date="' + c.date + '" title="' + esc(tip) + '">' +
        '<div class="cal-day">' + c.day + '</div>' +
        (att ? '<span class="cal-status">' + ATT_STATUS[att.status] + '</span>' : '<span class="cal-status">未选</span>') +
        '</div>';
    }
  });
  body += '</div>';
  $('calendarWrap').innerHTML = head + body;
  $('calendarWrap').classList.toggle('is-locked', !!attLockOf(driverId, month));
  syncAttLockUi(driverId, month);

  // 统计
  var statWork = 0, statRest = 0, statWeather = 0, statTripsDays = Object.keys(tripsMap).length;
  Object.values(attMap).forEach(function (a) {
    if (a.status === 'work') statWork++;
    else if (a.status === 'rest') statRest++;
    else if (a.status === 'weather') statWeather++;
  });
  $('attStats').innerHTML =
    '<span class="stat-pill">正常 <strong>' + statWork + '</strong> 天</span>' +
    '<span class="stat-pill rest">休息 <strong>' + statRest + '</strong> 天</span>' +
    '<span class="stat-pill weather">台风 <strong>' + statWeather + '</strong> 天</span>' +
    '<span class="stat-pill">趟次记录 <strong>' + statTripsDays + '</strong> 天（对照）</span>';
}

/** 点击格子：循环切换状态（纯本地） */
function toggleAttendance(dateStr) {
  var driverId = Number($('attDriver').value);
  if (!dateStr || !driverId) return;
  if (attLockOf(driverId, String(dateStr).slice(0, 7))) {
    toast('本月考勤已确认，不能再修改', 'error');
    return;
  }
  var existing = db.attendance.find(function (a) {
    return a.driver_id === driverId && String(a.date) === dateStr;
  });
  if (existing) {
    var idx = ATT_STATUS_CYCLE.indexOf(existing.status);
    if (idx >= 0 && idx < ATT_STATUS_CYCLE.length - 1) {
      existing.status = ATT_STATUS_CYCLE[idx + 1];
    } else {
      db.attendance = db.attendance.filter(function (a) { return a !== existing; });
      saveLocal();
      renderAttCalendar();
      return;
    }
  } else {
    db.attendance.push({
      id: newId(),
      date: dateStr,
      driver_id: driverId,
      status: 'work',
      note: '',
    });
  }
  saveLocal();
  renderAttCalendar();
}

