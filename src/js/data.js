/* ===== js/data.js ===== */
/* 数据操作（增删改查） */
'use strict';

  /* ================= 数据操作（全部 async） ================= */
  function validatePhone(phone) {
    var value = String(phone || '').trim();
    if (!value) throw new Error('请填写手机号');
    if (!/^\d{11}$/.test(value)) throw new Error('手机号格式错误');
    return value;
  }

  function addDriver(input) {
    if (!isManager()) throw new Error('员工模式无法修改司机信息');
    var name = String(input.name || '').trim();
    var plate = String(input.plate || '').trim();
    if (!name) throw new Error('请填写司机姓名');
    if (!plate) throw new Error('请填写车牌号');
    var phone = validatePhone(input.phone);
    var driver = { id: newId(), name: name, plate: plate, phone: phone };
    db.drivers.push(driver);
    saveLocal();
    return driver;
  }

  function updateDriver(id, input) {
    if (!isManager()) throw new Error('员工模式无法修改司机信息');
    var driver = db.drivers.find(function (item) { return item.id === id; });
    if (!driver) throw new Error('司机不存在');
    var name = String(input.name || '').trim();
    var plate = String(input.plate || '').trim();
    if (!name) throw new Error('请填写司机姓名');
    if (!plate) throw new Error('请填写车牌号');
    driver.name = name;
    driver.plate = plate;
    driver.phone = validatePhone(input.phone);
    saveLocal();
    return driver;
  }

  function removeDriver(id) {
    if (!isManager()) throw new Error('员工模式无法修改司机信息');
    var used =
      db.trips.some(function (item) { return item.driver_id === id; }) ||
      db.fuel.some(function (item) { return item.driver_id === id; });
    if (used) throw new Error('该司机已有趟次或加油记录，不能删除');
    db.drivers = db.drivers.filter(function (item) { return item.id !== id; });
    saveLocal();
  }

  function addRoute(input) {
    if (!isManager()) throw new Error('员工模式无法修改线路价目');
    var origin = String(input.origin || '').trim();
    if (!origin) throw new Error('请选择始发地');
    var steps = Array.isArray(input.steps) ? input.steps.filter(function (s) {
      return s && s.action && s.dest;
    }) : [];
    if (!steps.length) throw new Error('请至少添加一段步骤');
    var duplicated = db.routes.some(function (item) {
      if (!item.steps || !Array.isArray(item.steps)) return false;
      if (item.origin !== origin) return false;
      if (item.steps.length !== steps.length) return false;
      return item.steps.every(function (s, i) {
        return s.action === steps[i].action && s.dest === steps[i].dest;
      });
    });
    if (duplicated) throw new Error('该路线已存在');
    var totalKm = parseNumber(input.total_km, '总公里');
    var totalCommission = parseNumber(input.total_commission, '总提成');
    var route = {
      id: newId(), origin: origin, steps: steps,
      total_km: round2(totalKm), total_commission: round2(totalCommission),
    };
    db.routes.push(route);
    saveLocal();
    return route;
  }

  function updateRoute(id, input) {
    if (!isManager()) throw new Error('员工模式无法修改线路价目');
    var route = db.routes.find(function (item) { return item.id === id; });
    if (!route) throw new Error('线路不存在');
    var origin = String(input.origin || '').trim();
    if (!origin) throw new Error('请选择始发地');
    var steps = Array.isArray(input.steps) ? input.steps.filter(function (s) {
      return s && s.action && s.dest;
    }) : [];
    if (!steps.length) throw new Error('请至少添加一段步骤');
    var duplicated = db.routes.some(function (item) {
      if (item.id === id) return false;
      if (!item.steps || !Array.isArray(item.steps)) return false;
      if (item.origin !== origin) return false;
      if (item.steps.length !== steps.length) return false;
      return item.steps.every(function (s, i) {
        return s.action === steps[i].action && s.dest === steps[i].dest;
      });
    });
    if (duplicated) throw new Error('该路线已存在');
    var totalKm = parseNumber(input.total_km, '总公里');
    var totalCommission = parseNumber(input.total_commission, '总提成');
    route.origin = origin;
    route.steps = steps;
    route.total_km = round2(totalKm);
    route.total_commission = round2(totalCommission);
    saveLocal();
    return route;
  }

  function removeRoute(id) {
    if (!isManager()) throw new Error('员工模式无法修改线路价目');
    db.routes = db.routes.filter(function (item) { return item.id !== id; });
    saveLocal();
  }

  function addTrip(input) {
    var date = String(input.date || '').trim();
    if (!validDate(date)) throw new Error('请选择正确的日期');
    var driverId = Number(input.driver_id);
    var driver = db.drivers.find(function (item) { return item.id === driverId; });
    if (!driver) throw new Error('请选择司机');
    var km = parseNumber(input.km, '公里数');
    var commission = parseNumber(input.commission, '提成');
    var routeId = input.route_id ? Number(input.route_id) : null;
    var routeName = '';
    var routeOrigin = '';
    var routeSteps = [];
    if (routeId) {
      var route = db.routes.find(function (item) { return item.id === routeId; });
      if (!route) throw new Error('所选路线模板不存在');
      routeName = buildRouteName(route);
      routeOrigin = route.origin;
      routeSteps = route.steps || [];
    } else {
      routeOrigin = String(input.route_origin || '').trim();
      routeSteps = Array.isArray(input.route_steps) ? input.route_steps.filter(function (s) {
        return s && s.action && s.dest;
      }) : [];
      if (!routeOrigin) throw new Error('请选择始发地');
      if (!routeSteps.length) throw new Error('请至少添加一段行驶步骤');
      routeName = buildRouteName({ origin: routeOrigin, steps: routeSteps });
    }
    var trip = {
      id: newId(), date: date, driver_id: driverId,
      route_id: routeId, route_origin: routeOrigin, route_steps: routeSteps,
      route_name: routeName, km: round2(km), commission: round2(commission),
      updated_by: operatorName(), updated_at: nowStamp(),
    };
    db.trips.push(trip);
    saveLocal();
    return trip;
  }

  function removeTrip(id) {
    db.trips = db.trips.filter(function (item) { return item.id !== id; });
    saveLocal();
  }

  function addFuel(input) {
    var date = String(input.date || '').trim();
    if (!validDate(date)) throw new Error('请选择正确的日期');
    var driverId = Number(input.driver_id);
    var driver = db.drivers.find(function (item) { return item.id === driverId; });
    if (!driver) throw new Error('请选择司机');
    var place = String(input.place || '').trim();
    if (place !== '加油站' && place !== '仓库') throw new Error('加油地点只能是加油站或仓库');
    var liters = parseNumber(input.liters, '加油升数', 0.01);
    var record = {
      id: newId(), date: date, driver_id: driverId,
      place: place, liters: round2(liters),
      updated_by: operatorName(), updated_at: nowStamp(),
    };
    db.fuel.push(record);
    saveLocal();
    return record;
  }

  function removeFuel(id) {
    db.fuel = db.fuel.filter(function (item) { return item.id !== id; });
    saveLocal();
  }

