/* 备份导出 / 恢复 */
'use strict';

  /* ================= 备份 ================= */
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


