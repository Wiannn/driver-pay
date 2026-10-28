/* 司机信息页：结构 + 事件 + 逻辑都在这个文件里 */
'use strict';

definePage('drivers', {
  html: `
    <div class="page-head">
      <div>
        <h2>司机信息</h2>
        <p class="sub">一人一车固定对应，结算时按司机归集。</p>
      </div>
    </div>

    <form class="entry-card" id="driverForm">
      <input type="hidden" id="driverId">
      <div class="field">
        <label for="driverName">姓名</label>
        <input type="text" id="driverName" placeholder="张三" required>
      </div>
      <div class="field">
        <label for="driverPlate">车牌号</label>
        <input type="text" id="driverPlate" placeholder="沪A12345" required>
      </div>
      <div class="field">
        <label for="driverPhone">手机号</label>
        <input type="text" id="driverPhone" placeholder="13800000000" inputmode="tel">
      </div>
      <div class="field field-submit">
        <button type="submit" class="btn btn-primary" id="driverSubmit">添加司机</button>
        <button type="button" class="btn btn-ghost is-hidden" id="driverCancel">取消</button>
      </div>
    </form>

    <div class="table-card">
      <div class="table-head">
        <h3>司机名单</h3>
        <span class="table-sum" id="driverSummary"></span>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>车牌号</th>
              <th>手机号</th>
              <th class="op"></th>
            </tr>
          </thead>
          <tbody id="driverRows"></tbody>
        </table>
      </div>
    </div>
  `,

  init: function () {
    $('driverForm').addEventListener('submit', saveDriver);
    $('driverCancel').addEventListener('click', resetDriverForm);
  },
});

function renderDriverTable() {
  var tbody = $('driverRows');
  $('driverSummary').textContent = '共 ' + db.drivers.length + ' 人';

  if (!db.drivers.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">还没有司机，请在上方添加</td></tr>';
    return;
  }

  tbody.innerHTML = db.drivers
    .map(function (driver) {
      return (
        '<tr><td>' + esc(driver.name) + '</td>' +
        '<td><span class="plate">' + esc(driver.plate) + '</span></td>' +
        '<td>' + (driver.phone ? esc(driver.phone) : '<span class="muted">—</span>') + '</td>' +
        '<td class="op">' +
        '<button type="button" class="link" data-edit-driver="' + driver.id + '">编辑</button>' +
        '<button type="button" class="link-danger" data-del-driver="' + driver.id + '">删除</button>' +
        '</td></tr>'
      );
    })
    .join('');
}

function saveDriver(event) {
  event.preventDefault();
  try {
    var id = Number($('driverId').value);
    var payload = {
      name: $('driverName').value,
      plate: $('driverPlate').value,
      phone: $('driverPhone').value,
    };
    if (id) {
      updateDriver(id, payload);
      toast('司机信息已更新');
    } else {
      addDriver(payload);
      toast('司机已添加');
    }
    resetDriverForm();
    refreshData();
    renderPage();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function editDriver(id) {
  var driver = db.drivers.find(function (item) {
    return item.id === id;
  });
  if (!driver) return;
  $('driverId').value = driver.id;
  $('driverName').value = driver.name;
  $('driverPlate').value = driver.plate;
  $('driverPhone').value = driver.phone;
  $('driverSubmit').textContent = '保存修改';
  $('driverCancel').classList.remove('is-hidden');
  $('driverName').focus();
}

function resetDriverForm() {
  $('driverId').value = '';
  $('driverForm').reset();
  $('driverSubmit').textContent = '添加司机';
  $('driverCancel').classList.add('is-hidden');
}
