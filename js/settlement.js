/* 结算计算 + 月度结算页 */
'use strict';

  /* ================= 结算 ================= */
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


