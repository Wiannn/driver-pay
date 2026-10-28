/* 司机信息 */
'use strict';

  /* ================= 司机 ================= */
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


