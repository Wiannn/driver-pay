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
        <span class="legend-item"><i class="dot dot-weather"></i>台风/天气</span>
        <span class="legend-item"><i class="dot dot-empty"></i>未登记</span>
      </div>
    </div>

    <div class="attendance-stats" id="attStats"></div>

    <div class="calendar-wrap" id="calendarWrap"></div>
  `,

  init: function () {
    $('attMonth').addEventListener('change', renderAttCalendar);
    $('attDriver').addEventListener('change', renderAttCalendar);

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
    $('attStats').innerHTML = '';
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
