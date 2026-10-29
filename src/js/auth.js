/* ===== js/auth.js ===== */
/* 身份选择页（登录）：选身份之前主界面完全不渲染 */
'use strict';

var AUTH_HTML = `
  <div class="auth-view is-hidden" id="authView">
    <div class="auth-card">
      <div class="auth-logo">薪</div>
      <h1 class="auth-title">司机工资结算</h1>
      <p class="auth-sub">请选择本次使用的身份</p>
      <div class="auth-actions" id="authActions">
        <button type="button" class="btn btn-ghost" id="roleStaffBtn">员工进入</button>
        <button type="button" class="btn btn-primary" id="roleManagerBtn">主管进入</button>
      </div>
      <div class="auth-pin is-hidden" id="rolePinWrap">
        <label for="rolePinInput">主管 PIN</label>
        <input type="password" id="rolePinInput" inputmode="numeric" maxlength="4" autocomplete="off">
        <p class="auth-error is-hidden" id="rolePinError"></p>
        <div class="auth-pin-actions">
          <button type="button" class="btn btn-ghost" id="rolePinCancel">返回</button>
          <button type="button" class="btn btn-primary" id="rolePinOk">进入</button>
        </div>
      </div>
    </div>
  </div>
`;

// 身份页的 DOM 在脚本加载时注入，先于 init.js 的 DOMContentLoaded 执行
document.addEventListener('DOMContentLoaded', function () {
  document.body.insertAdjacentHTML('beforeend', AUTH_HTML);
  bindAuthControls();
});

function bindAuthControls() {
  $('roleStaffBtn').addEventListener('click', function () {
    enterApp('staff');
  });
  $('roleManagerBtn').addEventListener('click', function () {
    $('authActions').classList.add('is-hidden');
    $('rolePinWrap').classList.remove('is-hidden');
    $('rolePinError').classList.add('is-hidden');
    $('rolePinInput').value = '';
    $('rolePinInput').focus();
  });
  $('rolePinCancel').addEventListener('click', backToRoleChoices);
  $('rolePinOk').addEventListener('click', tryManagerLogin);
  $('rolePinInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      tryManagerLogin();
    }
  });
}

function backToRoleChoices() {
  $('rolePinWrap').classList.add('is-hidden');
  $('authActions').classList.remove('is-hidden');
  $('rolePinError').classList.add('is-hidden');
}

/** 打开身份选择页：整屏接管，主界面隐藏 */
function showAuth() {
  document.body.classList.add('is-auth');
  $('authView').classList.remove('is-hidden');
  backToRoleChoices();
  $('roleMenu').classList.add('is-hidden');
}

/** 进入主界面 */
function hideAuth() {
  document.body.classList.remove('is-auth');
  $('authView').classList.add('is-hidden');
}

/** 选定身份：首次进入跑完整初始化，已在运行则只按新身份刷新 */
function enterApp(role) {
  setRole(role);
  hideAuth();
  if (appStarted) {
    applyRole();
    placeMonthBox(state.page);
    refreshData();
    renderPage();
    return;
  }
  startApp();
}

function tryManagerLogin() {
  // db 未加载时先读一次，才能校验改过的 PIN
  if (!db) loadDb();
  var pin = String($('rolePinInput').value || '').trim();
  if (!/^\d{4}$/.test(pin)) {
    showPinError('请输入 4 位数字');
    return;
  }
  if (pin !== managerPin()) {
    showPinError('PIN 不正确');
    return;
  }
  enterApp('manager');
}

function showPinError(text) {
  var el = $('rolePinError');
  el.textContent = text;
  el.classList.remove('is-hidden');
  $('rolePinInput').focus();
}

/** 退出登录：回到身份选择页 */
function exitToAuth() {
  $('roleMenu').classList.add('is-hidden');
  if (!confirm('退出当前身份，重新选择身份？')) return;
  setRole('');
  showAuth();
}
