/* 月度结算页：结构 + 样式 + 逻辑（含 Excel 导出、数据备份）都在这个文件里 */
'use strict';

definePage('settlement', {
  html: `
    <div class="page-head">
      <div>
        <h2>月度结算</h2>
        <p class="sub" id="settleHint">按月自动汇总每位司机的工资</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn-ghost" id="settleRefresh">刷新</button>
        <button type="button" class="btn btn-primary" id="exportBtn">导出 Excel</button>
      </div>
    </div>
    <div class="rule-bar" id="ruleBar"></div>
    <div class="driver-grid" id="settleList"></div>

    <div class="table-card">
      <div class="table-head">
        <h3>数据备份</h3>
        <span class="table-sum">数据只保存在这台电脑的浏览器里</span>
      </div>
      <div class="backup-body">
        <p class="backup-tip">换电脑、重装系统或清理浏览器数据前，请先导出备份。恢复备份会覆盖当前全部数据。</p>
        <div class="backup-actions">
          <button type="button" class="btn btn-ghost" id="backupBtn">导出备份（JSON）</button>
          <button type="button" class="btn btn-ghost" id="restoreBtn">恢复备份</button>
          <input type="file" id="restoreFile" accept=".json,application/json" hidden>
        </div>
      </div>
    </div>
  `,

  css: `
/* ---------- 司机结算卡片 ---------- */
.driver-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(540px, 1fr));
  gap: 18px;
  align-items: start;
}

.driver-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.03), 0 14px 32px -28px rgba(16, 24, 40, 0.4);
  overflow: hidden;
}

.dc-head {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 18px 20px 15px;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 17px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dc-id {
  flex: 1;
  min-width: 0;
}

.dc-id h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.dc-id p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.dc-id .dot {
  color: #c3cee0;
}

.dc-pay {
  text-align: right;
  flex-shrink: 0;
}

.dc-pay span {
  display: block;
  font-size: 11.5px;
  color: var(--muted);
}

.dc-pay strong {
  display: block;
  margin-top: 1px;
  font-size: 23px;
  font-weight: 600;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.stat {
  background: #fbfcfe;
  padding: 11px 14px;
}

.stat label {
  display: block;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.2px;
}

.stat strong {
  display: block;
  margin-top: 3px;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.stat.warn strong {
  color: var(--warn);
}

.stat.good strong {
  color: var(--good);
}

.dc-detail summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 13px;
  color: var(--ink-soft);
  border-bottom: 1px solid var(--line);
  user-select: none;
  transition: background 0.15s;
}

.dc-detail summary:hover {
  background: #f8fafd;
}

.dc-detail summary::-webkit-details-marker {
  display: none;
}

.dc-detail summary::before {
  content: "▸";
  color: #9aa7b8;
  font-size: 11px;
  transition: transform 0.15s;
}

.dc-detail[open] summary::before {
  transform: rotate(90deg);
}

.dc-detail summary em {
  font-style: normal;
  margin-left: auto;
  font-size: 11.5px;
  color: var(--muted);
}

.dc-detail .detail-body {
  padding: 4px 0 0;
}

.mini-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.mini-table th {
  text-align: left;
  padding: 8px 20px;
  font-weight: 500;
  color: var(--muted);
  font-size: 11.5px;
  background: #fbfcfe;
  border-bottom: 1px solid var(--line);
}

.mini-table td {
  padding: 8px 20px;
  border-bottom: 1px solid #eff2f7;
  color: var(--ink-soft);
}

.mini-table tr:last-child td {
  border-bottom: 0;
}

.mini-table .route-name {
  color: var(--ink);
}

.mini-table .num,
.mini-table th.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.mini-table .op,
.mini-table th.op {
  text-align: right;
  width: 78px;
  padding-left: 4px;
  padding-right: 20px;
  white-space: nowrap;
}

.mini-total {
  padding: 9px 20px 13px;
  text-align: right;
  font-size: 12px;
  color: var(--muted);
  background: #fbfcfe;
  border-top: 1px solid var(--line);
}

/* ---------- 数据备份 ---------- */
.backup-body {
  padding: 16px 20px 18px;
}

.backup-tip {
  margin: 0 0 12px;
  font-size: 12.5px;
  color: var(--muted);
}

.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* ---------- 窄屏 ---------- */
@media (max-width: 1180px) {
  .driver-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
  `,

  init: function () {
    $('settleRefresh').addEventListener('click', function () {
      loadDb();
      refreshData();
      renderPage();
      toast('数据已刷新');
    });
    $('exportBtn').addEventListener('click', exportExcel);

    $('backupBtn').addEventListener('click', exportBackup);
    $('restoreBtn').addEventListener('click', function () {
      $('restoreFile').click();
    });
    $('restoreFile').addEventListener('change', importBackup);
  },
});

/* ================= 结算计算 ================= */
function computeSettlement(month) {
  var drivers = db.drivers.map(function (driver) {
    var trips = db.trips
      .filter(function (item) {
        return item.driver_id === driver.id && String(item.date).slice(0, 7) === month;
      })
      .sort(function (a, b) {
        return a.date.localeCompare(b.date) || a.id - b.id;
      });
    var fuelRows = db.fuel
      .filter(function (item) {
        return item.driver_id === driver.id && String(item.date).slice(0, 7) === month;
      })
      .sort(function (a, b) {
        return a.date.localeCompare(b.date) || a.id - b.id;
      });

    var days = {};
    trips.forEach(function (item) {
      days[item.date] = true;
    });
    // 出勤登记：本月该司机的全部记录（正常/休息/台风）
    var attAll = db.attendance
      .filter(function (a) {
        return a.driver_id === driver.id && String(a.date).slice(0, 7) === month;
      })
      .sort(function (a, b) {
        return String(a.date).localeCompare(String(b.date));
      });
    var attRows = attAll.filter(function (a) {
      return a.status === 'work';
    });
    var restDays = attAll.filter(function (a) {
      return a.status === 'rest';
    }).length;
    var weatherDays = attAll.filter(function (a) {
      return a.status === 'weather';
    }).length;
    // 上班天数：优先从 attendance 取，没有登记时才 fallback 到 trips
    var dayCount = attRows.length ? attRows.length : Object.keys(days).length;
    var km = round2(
      trips.reduce(function (sum, item) {
        return sum + Number(item.km);
      }, 0)
    );
    var commission = round2(
      trips.reduce(function (sum, item) {
        return sum + Number(item.commission);
      }, 0)
    );
    var actualFuel = round2(
      fuelRows.reduce(function (sum, item) {
        return sum + Number(item.liters);
      }, 0)
    );
    var expectedFuel = round2(km * FUEL_PER_KM);
    var savedFuel = round2(expectedFuel - actualFuel);
    var savingAmount = round2(savedFuel * SAVING_PRICE);
    var salary = round2(dayCount * DAILY_WAGE + commission + savingAmount);

    return {
      id: driver.id,
      name: driver.name,
      plate: driver.plate,
      phone: driver.phone,
      days: dayCount,
      rest_days: restDays,
      weather_days: weatherDays,
      km: km,
      commission: commission,
      expected_fuel: expectedFuel,
      actual_fuel: actualFuel,
      saved_fuel: savedFuel,
      saving_amount: savingAmount,
      salary: salary,
      trips: trips,
      fuel: fuelRows,
      attendance: attAll,
    };
  });

  function total(key) {
    return round2(
      drivers.reduce(function (sum, item) {
        return sum + Number(item[key]);
      }, 0)
    );
  }

  return {
    month: month,
    drivers: drivers,
    totals: {
      days: drivers.reduce(function (sum, item) {
        return sum + item.days;
      }, 0),
      rest_days: drivers.reduce(function (sum, item) {
        return sum + item.rest_days;
      }, 0),
      weather_days: drivers.reduce(function (sum, item) {
        return sum + item.weather_days;
      }, 0),
      km: total('km'),
      commission: total('commission'),
      expected_fuel: total('expected_fuel'),
      actual_fuel: total('actual_fuel'),
      saved_fuel: total('saved_fuel'),
      saving_amount: total('saving_amount'),
      salary: total('salary'),
    },
  };
}

/* ================= 月度结算 ================= */
function renderSettlement() {
  var data = computeSettlement(state.month);
  $('settleHint').innerHTML =
    monthLabel(state.month) +
    ' · ' +
    data.drivers.length +
    ' 位司机 · 工资合计 <b>' +
    yuan(data.totals.salary) +
    '</b>';

  $('ruleBar').innerHTML = [
    '工资 = 上班天数 × ' + DAILY_WAGE + ' + 提成合计 + 节油',
    '应加油量 = 总公里数 × ' + FUEL_PER_KM,
    '节油 =（应加油量 − 实际加油量）× ' + SAVING_PRICE,
  ]
    .map(function (text) {
      return '<span>' + esc(text) + '</span>';
    })
    .join('');

  var list = $('settleList');
  if (!data.drivers.length) {
    list.innerHTML = '<div class="empty">还没有司机，请先到「司机信息」添加</div>';
    return;
  }
  list.innerHTML = data.drivers
    .map(function (driver) {
      return driverCard(driver);
    })
    .join('');
}

function stat(label, value, className) {
  return (
    '<div class="stat ' +
    (className || '') +
    '"><label>' +
    label +
    '</label><strong>' +
    value +
    '</strong></div>'
  );
}

function driverCard(driver) {
  var negative = Number(driver.saved_fuel) < 0;
  var dayWage = Number(driver.days) * DAILY_WAGE;
  return (
    '<article class="driver-card">' +
    '<div class="dc-head">' +
    '<div class="avatar">' + esc((driver.name || '?').slice(0, 1)) + '</div>' +
    '<div class="dc-id"><h3>' + esc(driver.name) + '</h3><p>' +
    '<span class="plate">' + esc(driver.plate) + '</span>' +
    (driver.phone ? '<span class="dot">·</span>' + esc(driver.phone) : '') +
    '</p></div>' +
    '<div class="dc-pay"><span>本月工资</span><strong>' + yuan(driver.salary) + '</strong></div>' +
    '</div>' +
    '<div class="stat-grid">' +
    stat('上班天数', driver.days + ' 天') +
    stat('出勤工资', yuan(dayWage)) +
    stat('总公里数', fmt2(driver.km) + ' km') +
    stat('提成合计', yuan(driver.commission)) +
    stat('应加油量', fmt2(driver.expected_fuel) + ' L') +
    stat('实际加油量', fmt2(driver.actual_fuel) + ' L') +
    stat('节油量', fmt2(driver.saved_fuel) + ' L', negative ? 'warn' : '') +
    stat('节油奖励', yuan(driver.saving_amount), negative ? 'warn' : 'good') +
    '</div>' +
    '<details class="dc-detail"><summary>趟次明细<em>' + driver.trips.length + ' 趟</em></summary>' +
    '<div class="detail-body">' + detailTrips(driver) + '</div></details>' +
    '<details class="dc-detail"><summary>加油明细<em>' + driver.fuel.length + ' 笔</em></summary>' +
    '<div class="detail-body">' + detailFuel(driver) + '</div></details>' +
    '</article>'
  );
}

function detailTrips(driver) {
  if (!driver.trips.length) return '<div class="empty small">本月没有趟次记录</div>';
  var rows = driver.trips
    .map(function (trip) {
      return (
        '<tr><td>' + esc(trip.date) + '</td>' +
        '<td class="route-name">' + esc(trip.route_name) + '</td>' +
        '<td class="num">' + fmt2(trip.km) + '</td>' +
        '<td class="num">' + yuan(trip.commission) + '</td>' +
        '<td class="op"><button type="button" class="link-danger" data-del-trip="' +
        trip.id + '">删除</button></td></tr>'
      );
    })
    .join('');
  return (
    '<div class="mini-table"><table><thead><tr><th>日期</th><th>线路</th>' +
    '<th class="num">公里</th><th class="num">提成</th><th class="op"></th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table>' +
    '<div class="mini-total">合计 ' + driver.trips.length + ' 趟 · ' +
    fmt2(driver.km) + ' km · ' + yuan(driver.commission) + '</div></div>'
  );
}

function detailFuel(driver) {
  if (!driver.fuel.length) return '<div class="empty small">本月没有加油记录</div>';
  var rows = driver.fuel
    .map(function (item) {
      return (
        '<tr><td>' + esc(item.date) + '</td><td>' + esc(item.place) + '</td>' +
        '<td class="num">' + fmt2(item.liters) + '</td>' +
        '<td class="op"><button type="button" class="link-danger" data-del-fuel="' +
        item.id + '">删除</button></td></tr>'
      );
    })
    .join('');
  return (
    '<div class="mini-table"><table><thead><tr><th>日期</th><th>地点</th>' +
    '<th class="num">升数</th><th class="op"></th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table>' +
    '<div class="mini-total">合计 ' + driver.fuel.length + ' 笔 · ' +
    fmt2(driver.actual_fuel) + ' L</div></div>'
  );
}

/* ================= 数据备份 ================= */
function exportBackup() {
  var blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  downloadBlob(blob, '司机工资结算_备份_' + todayString() + '.json');
  toast('备份已导出');
}

function importBackup(event) {
  var input = event.target;
  var file = input.files && input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var parsed = JSON.parse(reader.result);
      if (
        !parsed ||
        !Array.isArray(parsed.drivers) ||
        !Array.isArray(parsed.routes) ||
        !Array.isArray(parsed.trips) ||
        !Array.isArray(parsed.fuel)
      ) {
        throw new Error('备份文件格式不正确');
      }
      if (!confirm('恢复备份会覆盖当前所有数据，确定继续吗？')) return;

      toast('正在恢复数据...');
      db = {
        configs: parsed.configs || defaultDb().configs,
        drivers: parsed.drivers,
        routes: parsed.routes,
        trips: parsed.trips,
        fuel: parsed.fuel,
        attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
      };
      saveLocal();
      toast('备份已恢复');
      refreshData();
      renderPage();
    } catch (error) {
      toast(error.message, 'error');
    }
  };
  reader.readAsText(file, 'utf-8');
  input.value = '';
}

/* ================= Excel 导出 ================= */
  function exportExcel() {
    if (!db.drivers.length) {
      toast('请先添加司机信息', 'error');
      return;
    }
    var data = computeSettlement(state.month);
    var bytes = buildWorkbook(state.month, data);
    downloadBlob(
      new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      '司机工资结算_' + state.month + '.xlsx'
    );
  }

  /* ===== xlsx begin ===== */
  var S_DEFAULT = 0;
  var S_BOLD = 1;
  var S_NUM = 2;
  var S_NUM_BOLD = 3;
  var S_HEADER = 4;
  var S_TITLE = 5;
  var S_TOTAL = 6;
  var S_TOTAL_NUM = 7;
  var S_INT = 8;
  var S_TOTAL_INT = 10;

  function S(v) {
    return { v: v, s: S_DEFAULT };
  }
  function B(v) {
    return { v: v, s: S_BOLD };
  }
  function TITLE(v) {
    return { v: v, s: S_TITLE };
  }
  function H(v) {
    return { v: v, s: S_HEADER };
  }
  function N(v) {
    return { v: round2(v), s: S_NUM };
  }
  function NB(v) {
    return { v: round2(v), s: S_NUM_BOLD };
  }
  function INT(v) {
    return { v: Math.round(Number(v) || 0), s: S_INT };
  }
  function TL(v) {
    return { v: v, s: S_TOTAL };
  }
  function TN(v) {
    return { v: round2(v), s: S_TOTAL_NUM };
  }
  function TI(v) {
    return { v: Math.round(Number(v) || 0), s: S_TOTAL_INT };
  }

  function colLetter(index) {
    var letters = '';
    var n = index;
    while (n > 0) {
      var remainder = (n - 1) % 26;
      letters = String.fromCharCode(65 + remainder) + letters;
      n = Math.floor((n - 1) / 26);
    }
    return letters;
  }

  function xmlEscape(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function xmlAttr(text) {
    return xmlEscape(text).replace(/"/g, '&quot;');
  }

  function numberText(value) {
    var number = Number(value);
    if (!isFinite(number)) return '0';
    return String(round2(number));
  }

  function sheetToXml(sheet) {
    var parts = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    ];
    if (sheet.widths && sheet.widths.length) {
      parts.push('<cols>');
      for (var w = 0; w < sheet.widths.length; w += 1) {
        parts.push(
          '<col min="' + (w + 1) + '" max="' + (w + 1) + '" width="' +
            sheet.widths[w] + '" customWidth="1"/>'
        );
      }
      parts.push('</cols>');
    }
    parts.push('<sheetData>');
    sheet.rows.forEach(function (row, rowIndex) {
      var cells = [];
      row.forEach(function (cell, colIndex) {
        if (!cell) return;
        var ref = colLetter(colIndex + 1) + (rowIndex + 1);
        if (typeof cell.v === 'number' && isFinite(cell.v)) {
          cells.push('<c r="' + ref + '" s="' + cell.s + '"><v>' + numberText(cell.v) + '</v></c>');
        } else {
          cells.push(
            '<c r="' + ref + '" s="' + cell.s + '" t="inlineStr"><is><t xml:space="preserve">' +
              xmlEscape(cell.v) + '</t></is></c>'
          );
        }
      });
      parts.push('<row r="' + (rowIndex + 1) + '">' + cells.join('') + '</row>');
    });
    parts.push('</sheetData></worksheet>');
    return parts.join('');
  }

  function uniqueSheetName(name, used) {
    var cleaned = String(name).replace(/[\[\]:*?\/\\]/g, '').trim() || 'Sheet';
    cleaned = cleaned.slice(0, 31);
    var candidate = cleaned;
    var suffix = 2;
    while (used[candidate.toLowerCase()]) {
      var tail = '(' + suffix + ')';
      candidate = cleaned.slice(0, 31 - tail.length) + tail;
      suffix += 1;
    }
    used[candidate.toLowerCase()] = true;
    return candidate;
  }

  var crcTableCache = null;
  function crcTable() {
    if (crcTableCache) return crcTableCache;
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n += 1) {
      var c = n;
      for (var k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
    crcTableCache = table;
    return table;
  }

  function crc32(bytes) {
    var table = crcTable();
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i += 1) {
      crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function zipStore(files) {
    var encoder = new TextEncoder();
    var dosDate = ((2020 - 1980) << 9) | (1 << 5) | 1;
    var localParts = [];
    var centralParts = [];
    var offset = 0;

    files.forEach(function (file) {
      var nameBytes = encoder.encode(file.name);
      var data = file.data;
      var crc = crc32(data);

      var local = new Uint8Array(30 + nameBytes.length);
      var localView = new DataView(local.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, 0, true);
      localView.setUint16(12, dosDate, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, data.length, true);
      localView.setUint32(22, data.length, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      localParts.push(local, data);

      var central = new Uint8Array(46 + nameBytes.length);
      var centralView = new DataView(central.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, 0, true);
      centralView.setUint16(14, dosDate, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, data.length, true);
      centralView.setUint32(24, data.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      central.set(nameBytes, 46);
      centralParts.push(central);

      offset += local.length + data.length;
    });

    var centralSize = centralParts.reduce(function (sum, part) {
      return sum + part.length;
    }, 0);

    var end = new Uint8Array(22);
    var endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);

    var total = offset + centralSize + end.length;
    var result = new Uint8Array(total);
    var position = 0;
    localParts.concat(centralParts).concat([end]).forEach(function (part) {
      result.set(part, position);
      position += part.length;
    });
    return result;
  }

  var STYLES_XML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/>' +
    '<numFmt numFmtId="165" formatCode="0"/></numFmts>' +
    '<fonts count="3">' +
    '<font><sz val="11"/><color theme="1"/><name val="等线"/><family val="2"/><scheme val="minor"/></font>' +
    '<font><b/><sz val="11"/><color theme="1"/><name val="等线"/><family val="2"/><scheme val="minor"/></font>' +
    '<font><b/><sz val="15"/><color theme="1"/><name val="等线"/><family val="2"/><scheme val="minor"/></font>' +
    '</fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF9"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right>' +
    '<top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>' +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="11">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>' +
    '<xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="165" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
    '<xf numFmtId="165" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="常规" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  function buildWorkbook(month, data) {
    var sheets = [];
    var used = {};

    data.drivers.forEach(function (driver) {
      var sheet = { name: uniqueSheetName(driver.name, used), widths: [18, 38, 14, 14, 14, 16], rows: [] };
      sheet.rows.push([TITLE(monthLabel(month) + ' 司机结算单')]);
      sheet.rows.push([
        B('姓名'), S(driver.name),
        B('车牌'), S(driver.plate),
        B('手机号'), S(driver.phone),
      ]);
      sheet.rows.push([]);
      sheet.rows.push([B('结算汇总')]);
      sheet.rows.push([H('项目'), H('数值')]);
      sheet.rows.push([S('上班天数'), INT(driver.days)]);
      sheet.rows.push([S('休息天数'), INT(driver.rest_days)]);
      sheet.rows.push([S('台风天数'), INT(driver.weather_days)]);
      sheet.rows.push([S('总公里数'), N(driver.km)]);
      sheet.rows.push([S('提成合计（元）'), N(driver.commission)]);
      sheet.rows.push([S('应加油量（升）'), N(driver.expected_fuel)]);
      sheet.rows.push([S('实际加油量（升）'), N(driver.actual_fuel)]);
      sheet.rows.push([S('节油量（升）'), N(driver.saved_fuel)]);
      sheet.rows.push([S('节油奖励（元）'), N(driver.saving_amount)]);
      sheet.rows.push([B('工资合计（元）'), NB(driver.salary)]);
      sheet.rows.push([]);
      sheet.rows.push([B('出勤明细')]);
      sheet.rows.push([H('日期'), H('状态')]);
      driver.attendance.forEach(function (att) {
        sheet.rows.push([S(att.date), S(ATT_STATUS[att.status] || att.status)]);
      });
      sheet.rows.push([
        TL('合计'),
        TL('正常 ' + driver.days + ' / 休息 ' + driver.rest_days + ' / 台风 ' + driver.weather_days),
      ]);
      sheet.rows.push([]);
      sheet.rows.push([B('趟次明细')]);
      sheet.rows.push([H('日期'), H('线路'), H('公里数'), H('提成（元）')]);
      driver.trips.forEach(function (trip) {
        sheet.rows.push([S(trip.date), S(trip.route_name), N(trip.km), N(trip.commission)]);
      });
      sheet.rows.push([TL('合计'), TL('共 ' + driver.trips.length + ' 趟'), TN(driver.km), TN(driver.commission)]);
      sheet.rows.push([]);
      sheet.rows.push([B('加油明细')]);
      sheet.rows.push([H('日期'), H('地点'), H('升数（升）')]);
      driver.fuel.forEach(function (item) {
        sheet.rows.push([S(item.date), S(item.place), N(item.liters)]);
      });
      sheet.rows.push([TL('合计'), TL('共 ' + driver.fuel.length + ' 笔'), TN(driver.actual_fuel)]);
      sheets.push(sheet);
    });

    var summary = {
      name: uniqueSheetName('汇总', used),
      widths: [14, 14, 12, 12, 12, 12, 14, 14, 14, 12, 12, 14],
      rows: [],
    };
    summary.rows.push([TITLE(monthLabel(month) + ' 全司机汇总')]);
    summary.rows.push([]);
    summary.rows.push([
      H('司机'), H('车牌'), H('上班天数'), H('休息天数'), H('台风天数'), H('总公里数'), H('提成合计'),
      H('应加油量（升）'), H('实际加油量（升）'), H('节油量（升）'),
      H('节油（元）'), H('工资（元）'),
    ]);
    data.drivers.forEach(function (driver) {
      summary.rows.push([
        S(driver.name), S(driver.plate), INT(driver.days), INT(driver.rest_days),
        INT(driver.weather_days), N(driver.km),
        N(driver.commission), N(driver.expected_fuel), N(driver.actual_fuel),
        N(driver.saved_fuel), N(driver.saving_amount), NB(driver.salary),
      ]);
    });
    var totals = data.totals;
    summary.rows.push([
      TL('合计'), TL(''), TI(totals.days), TI(totals.rest_days), TI(totals.weather_days),
      TN(totals.km), TN(totals.commission),
      TN(totals.expected_fuel), TN(totals.actual_fuel), TN(totals.saved_fuel),
      TN(totals.saving_amount), TN(totals.salary),
    ]);
    summary.rows.push([]);
    summary.rows.push([
      S(
        '计算规则：工资 = 上班天数 × 200 + 提成合计 + 节油；' +
          '应加油量 = 总公里数 × 0.34；节油 =（应加油量 − 实际加油量）× 4.5'
      ),
    ]);
    sheets.push(summary);

    var encoder = new TextEncoder();
    var contentOverrides = '';
    var sheetEntries = '';
    var relEntries = '';
    sheets.forEach(function (sheet, index) {
      contentOverrides +=
        '<Override PartName="/xl/worksheets/sheet' + (index + 1) + '.xml" ' +
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      sheetEntries +=
        '<sheet name="' + xmlAttr(sheet.name) + '" sheetId="' + (index + 1) +
        '" r:id="rId' + (index + 1) + '"/>';
      relEntries +=
        '<Relationship Id="rId' + (index + 1) +
        '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ' +
        'Target="worksheets/sheet' + (index + 1) + '.xml"/>';
    });
    var stylesId = sheets.length + 1;
    relEntries +=
      '<Relationship Id="rId' + stylesId +
      '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';

    var contentTypes =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      contentOverrides + '</Types>';

    var rootRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>';

    var workbookXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<bookViews><workbookView/></bookViews><sheets>' + sheetEntries + '</sheets></workbook>';

    var workbookRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      relEntries + '</Relationships>';

    var files = [
      { name: '[Content_Types].xml', data: encoder.encode(contentTypes) },
      { name: '_rels/.rels', data: encoder.encode(rootRels) },
      { name: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
      { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRels) },
      { name: 'xl/styles.xml', data: encoder.encode(STYLES_XML) },
    ];
    sheets.forEach(function (sheet, index) {
      files.push({
        name: 'xl/worksheets/sheet' + (index + 1) + '.xml',
        data: encoder.encode(sheetToXml(sheet)),
      });
    });

    return zipStore(files);
  }
  /* ===== xlsx end ===== */
