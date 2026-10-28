/* Excel(xlsx) 导出 */
'use strict';

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

