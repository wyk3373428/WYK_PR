// ตัวเชื่อมต่อ API แทน google.script.run (ใช้ได้เมื่อหน้าเว็บอยู่นอก Apps Script เช่น GitHub Pages)
// รูปแบบการเรียกเหมือนเดิม: google.script.run.withSuccessHandler(fn).withFailureHandler(fn).ชื่อฟังก์ชัน(args...)
(function () {
  const TOKEN_KEY = 'wyk_admin_token';

  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t) {
    try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  async function callApi(action, args) {
    // ใช้ text/plain เพื่อไม่ให้เบราว์เซอร์ส่ง CORS preflight (Apps Script ไม่รองรับ OPTIONS)
    const res = await fetch(window.APP_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, args: args, token: getToken() }),
      redirect: 'follow'
    });
    if (!res.ok) throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ (HTTP ' + res.status + ')');
    const json = await res.json();
    if (!json.ok) {
      if (json.code === 'AUTH') setToken('');
      throw new Error(json.error || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
    }
    // เก็บ token เมื่อ login สำเร็จ
    if (action === 'checkAdminLogin' && json.result && json.result.token) setToken(json.result.token);
    return json.result;
  }

  function defaultFailure(err) {
    console.error(err);
    if (window.Swal) Swal.fire('ข้อผิดพลาด', err.message, 'error');
  }

  function makeRunner(onSuccess, onFailure) {
    return new Proxy({}, {
      get(_, prop) {
        if (prop === 'withSuccessHandler') return fn => makeRunner(fn, onFailure);
        if (prop === 'withFailureHandler') return fn => makeRunner(onSuccess, fn);
        return (...args) => {
          callApi(prop, args)
            .then(r => { if (onSuccess) onSuccess(r); })
            .catch(err => (onFailure || defaultFailure)(err));
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = { run: makeRunner(null, null) };
  window.clearAdminToken = () => setToken('');
})();
