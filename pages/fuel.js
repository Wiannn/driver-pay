/* 加油录入页：结构 + 逻辑都在这个文件里 */
'use strict';

definePage('fuel', {
  html: `
    <div class="page-head">
      <div>
        <h2>加油录入</h2>
        <p class="sub">加油站和仓库的油都计入实际加油量，一起参与节油计算。</p>
      </div>
    </div>

    <form class="entry-card" id="fuelForm">
      <div class="field">
        <label for="fuelDate">日期</label>
        <input type="date" id="fuelDate" required>
      </div>
      <div class="field">
        <label for="fuelDriver">司机</label>
        <select id="fuelDriver" required></select>
      </div>
      <div class="field">
        <label for="fuelPlace">加油地点</label>
        <select id="fuelPlace" required>
          <option value="加油站">加油站</option>
          <option value="仓库">仓库</option>
        </select>
      </div>
      <div class="field">
        <label for="fuelLiters">加油升数（升）</label>
        <input type="number" id="fuelLiters" step="0.01" min="0.01" placeholder="0.00" required>
      </div>
      <div class="field field-submit">
        <button type="submit" class="btn btn-primary">保存加油</button>
      </div>
    </form>

    <div class="table-card">
      <div class="table-head">
        <h3>本月加油记录</h3>
        <span class="table-sum" id="fuelSummary"></span>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>司机</th>
              <th>地点</th>
              <th class="num">升数（升）</th>
              <th class="op"></th>
            </tr>
          </thead>
          <tbody id="fuelRows"></tbody>
        </table>
      </div>
    </div>
  `,

  init: function () {
    $('fuelForm').addEventListener('submit', saveFuel);
    // 选司机 = 只看这个司机的加油；不选 = 当月全部
    $('fuelDriver').addEventListener('change', renderFuel);
  },
});

function saveFuel(event) {
  event.preventDefault();
  try {
    var record = addFuel({
      date: $('fuelDate').value,
      driver_id: $('fuelDriver').value,
      place: $('fuelPlace').value,
      liters: $('fuelLiters').value,
    });
    ensureMonth(record.date);
    toast('加油记录已保存');
    $('fuelLiters').value = '';
    renderPage();
    $('fuelLiters').focus();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function renderFuel() {
  var month = state.month;
  var driverId = $('fuelDriver').value;
  var allRows = db.fuel.filter(function (item) {
    return String(item.date).slice(0, 7) === month;
  });
  var rows = driverId
    ? allRows.filter(function (item) {
        return String(item.driver_id) === String(driverId);
      })
    : allRows;
  rows = rows.sort(function (a, b) {
    return b.date.localeCompare(a.date) || b.id - a.id;
  });

  var tbody = $('fuelRows');
  if (!rows.length) {
    var hint = driverId
      ? '本月这个司机还没有加油记录'
      : db.fuel.length
        ? '本月还没有加油记录 · 试试切换月份（共有 ' + db.fuel.length + ' 笔历史数据）'
        : '还没有加油记录';
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">' + hint + '</td></tr>';
    $('fuelSummary').textContent = '共 0 笔';
    return;
  }

  tbody.innerHTML = rows
    .map(function (item) {
      var driver = db.drivers.find(function (driverItem) {
        return driverItem.id === item.driver_id;
      });
      return (
        '<tr><td>' + esc(item.date) + '</td>' +
        '<td>' + esc(driver ? driver.name : '—') + '</td>' +
        '<td>' + esc(item.place) + '</td>' +
        '<td class="num">' + fmt2(item.liters) + '</td>' +
        '<td class="op"><button type="button" class="link-danger" data-del-fuel="' +
        item.id + '">删除</button></td></tr>'
      );
    })
    .join('');

  var total = rows.reduce(function (sum, item) {
    return sum + Number(item.liters);
  }, 0);
  var station = rows
    .filter(function (item) {
      return item.place === '加油站';
    })
    .reduce(function (sum, item) {
      return sum + Number(item.liters);
    }, 0);
  var depot = total - station;
  $('fuelSummary').innerHTML =
    '共 <b>' + rows.length + '</b> 笔 · 合计 ' + fmt2(total) + ' L' +
    '（加油站 ' + fmt2(station) + ' L / 仓库 ' + fmt2(depot) + ' L）';
}
