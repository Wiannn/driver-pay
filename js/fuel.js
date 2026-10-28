/* 加油录入 */
'use strict';

  /* ================= 加油 ================= */
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
    var rows = db.fuel
      .filter(function (item) {
        return String(item.date).slice(0, 7) === month;
      })
      .sort(function (a, b) {
        return b.date.localeCompare(a.date) || b.id - a.id;
      });

    var tbody = $('fuelRows');
    if (!rows.length) {
      var hint = db.fuel.length
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


