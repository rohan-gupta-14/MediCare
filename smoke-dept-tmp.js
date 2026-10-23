/* TEMPORARY — headless-Chrome CDP smoke for the Phase 15 department UI. Removed after run. */
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FRONTEND = 'http://localhost:5173';
const ADMIN = { email: 'admin@deptsmoke.example.com', password: 'Admin123!' };
const DOCTOR = { email: 'doctor@deptstaff.example.com', password: 'Doctor123!' };
const DEBUG_PORT = 9335;

const results = [];
let failures = 0;
const check = (name, ok, extra = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`;
  results.push(line);
  console.log(line);
  if (!ok) failures += 1;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        this.handlers.forEach((h) => h(msg));
      }
    });
  }
  send(method, params = {}, sessionId = undefined) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout: ${method}`));
        }
      }, 15000);
    });
  }
  on(handler) {
    this.handlers.push(handler);
  }
}

const evalJs = async (cdp, sid, expression) => {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sid);
  if (r.exceptionDetails) {
    throw new Error('page eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  }
  return r.result.value;
};

const waitFor = async (cdp, sid, expr, timeoutMs = 10000, label = 'condition') => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await evalJs(cdp, sid, expr)) return true;
    await sleep(200);
  }
  throw new Error(`timeout waiting for ${label}`);
};

const login = async (cdp, sid, creds) => {
  await waitFor(cdp, sid, "Boolean(document.querySelector('button[type=submit]'))", 10000, 'login form ready');
  await evalJs(
    cdp,
    sid,
    `(function () {
      var set = function (sel, val) {
        var el = document.querySelector(sel);
        var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      set('input[type=email]', '${creds.email}');
      set('input[type=password]', '${creds.password}');
      document.querySelector('button[type=submit]').click();
      return true;
    })()`
  );
};

const ROW_COUNT_JS =
  "Array.from(document.querySelectorAll('tbody tr')).filter(function (tr) { return tr.querySelector('td:first-child a'); }).length";

async function main() {
  const userDataDir = path.join(os.tmpdir(), 'cdp-smoke-dept-' + Date.now());
  const chrome = spawn(
    CHROME,
    ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${userDataDir}`, '--no-first-run', '--no-default-browser-check', 'about:blank'],
    { stdio: 'ignore' }
  );

  let wsUrl = null;
  for (let i = 0; i < 50 && !wsUrl; i++) {
    await sleep(200);
    try {
      wsUrl = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json()).webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
  }
  if (!wsUrl) throw new Error('Chrome DevTools endpoint never came up');

  const browserWs = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    browserWs.addEventListener('open', res);
    browserWs.addEventListener('error', rej);
  });
  const cdp = new Cdp(browserWs);

  const exceptions = [];
  cdp.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      exceptions.push(d.exception?.description || d.text);
    }
  });

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: sid } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Runtime.enable', {}, sid);
  await cdp.send('Page.enable', {}, sid);

  const goto = async (url) => {
    await cdp.send('Page.navigate', { url }, sid);
    await sleep(1500);
  };

  /* ---------- admin login ---------- */
  await goto(`${FRONTEND}/login`);
  await login(cdp, sid, ADMIN);
  await waitFor(cdp, sid, "location.pathname === '/admin'", 10000, 'redirect to /admin');
  check('admin UI login → /admin', true);

  /* ---------- departments list ---------- */
  await goto(`${FRONTEND}/departments`);
  await waitFor(cdp, sid, `${ROW_COUNT_JS} === 2`, 10000, 'department rows');
  check('list renders 2 seeded departments', true);
  check(
    'sidebar shows Departments link (enabled)',
    await evalJs(cdp, sid, "Boolean(document.querySelector('a[href=\"/departments\"]'))")
  );
  check(
    'status badges visible (Active + Inactive)',
    await evalJs(cdp, sid, "document.body.innerText.includes('Active') && document.body.innerText.includes('Inactive')")
  );
  check(
    'search box present',
    await evalJs(cdp, sid, "Boolean(document.querySelector('input[aria-label=\"Search departments\"]'))")
  );

  /* ---------- debounced search ---------- */
  await evalJs(
    cdp,
    sid,
    `(function () {
      var el = document.querySelector('input[aria-label="Search departments"]');
      var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, 'neuro');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`
  );
  await waitFor(cdp, sid, `${ROW_COUNT_JS} === 1`, 10000, 'search filtered to 1 row');
  check('search "neuro" filters to Neurology', await evalJs(cdp, sid, "document.body.innerText.includes('Neurology') && !document.body.innerText.includes('Cardiology')"));
  // clear via Clear filters
  await evalJs(
    cdp,
    sid,
    `(function () {
      Array.from(document.querySelectorAll('button')).find(function (b) { return b.textContent.trim() === 'Clear filters'; }).click();
      return true;
    })()`
  );
  await waitFor(cdp, sid, `${ROW_COUNT_JS} === 2`, 10000, 'filters cleared');
  check('Clear filters restores both rows', true);

  /* ---------- status filter ---------- */
  await evalJs(
    cdp,
    sid,
    `(function () {
      var sel = document.querySelector('select[aria-label="Filter by status"]');
      var setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(sel, 'inactive');
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`
  );
  await waitFor(cdp, sid, `${ROW_COUNT_JS} === 1`, 10000, 'status filter applied');
  check('status=inactive filters to Neurology', await evalJs(cdp, sid, "document.body.innerText.includes('Neurology') && !document.body.innerText.includes('Cardiology')"));
  await evalJs(cdp, sid, "Array.from(document.querySelectorAll('button')).find(function (b) { return b.textContent.trim() === 'Clear filters'; }).click()");
  await waitFor(cdp, sid, `${ROW_COUNT_JS} === 2`, 10000, 'filters cleared again');

  /* ---------- create with head doctor ---------- */
  await evalJs(cdp, sid, "Array.from(document.querySelectorAll('button')).find(function (b) { return b.textContent.trim() === 'Add department'; }).click()");
  await waitFor(cdp, sid, "Boolean(document.querySelector('[role=\"dialog\"]'))", 5000, 'add modal open');
  // head-doctor select options must be loaded from /api/doctors
  await waitFor(cdp, sid, "Array.from(document.querySelectorAll('[role=\"dialog\"] select')[1].options).some(function (o) { return o.textContent.indexOf('Dr. Spare Smoke') >= 0; })", 10000, 'doctor options loaded');
  check('head select loaded doctors from API', true);
  await evalJs(
    cdp,
    sid,
    `(function () {
      var dialog = document.querySelector('[role="dialog"]');
      var setNative = function (el, val) {
        var proto = el instanceof HTMLSelectElement ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
        el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
      };
      setNative(dialog.querySelector('input[type="text"]'), 'Orthopedics');
      setNative(dialog.querySelector('input[type="text"]'), 'Orthopedics');
      var loc = Array.from(dialog.querySelectorAll('input[type="text"]'))[1];
      setNative(loc, 'Block C');
      var headSel = dialog.querySelectorAll('select')[1];
      var opt = Array.from(headSel.options).find(function (o) { return o.textContent.indexOf('Dr. Spare Smoke') >= 0; });
      setNative(headSel, opt.value);
      dialog.querySelector('textarea').value = 'Bones and joints';
      return true;
    })()`
  );
  await evalJs(cdp, sid, "document.querySelector('[role=\"dialog\"] button[type=\"submit\"]').click()");
  await waitFor(cdp, sid, `${ROW_COUNT_JS} === 3`, 10000, 'created row appears');
  check('create department → count 2→3', true);
  check('create toast shown', await evalJs(cdp, sid, "document.body.innerText.includes('Orthopedics added')"));
  check(
    'created row shows head doctor name',
    await evalJs(cdp, sid, "document.body.innerText.includes('Dr. Spare Smoke')")
  );

  /* ---------- details page ---------- */
  await goto(`${FRONTEND}/departments`);
  await waitFor(cdp, sid, `${ROW_COUNT_JS} === 3`, 10000, 'list reload');
  await evalJs(cdp, sid, "Array.from(document.querySelectorAll('a')).find(function (a) { return a.textContent.trim() === 'Cardiology'; }).click()");
  await waitFor(cdp, sid, "document.body.innerText.includes('Heart care unit')", 10000, 'details page');
  check('details shows description + location', await evalJs(cdp, sid, "document.body.innerText.includes('Block A, Floor 2')"));
  check('details shows no-head placeholder', await evalJs(cdp, sid, "document.body.innerText.includes('No head doctor assigned')"));

  /* ---------- edit: assign head ---------- */
  await evalJs(cdp, sid, "Array.from(document.querySelectorAll('button')).find(function (b) { return b.textContent.trim() === 'Edit'; }).click()");
  await waitFor(cdp, sid, "Boolean(document.querySelector('[role=\"dialog\"]')) && document.querySelector('[role=\"dialog\"] input[type=\"text\"]').value === 'Cardiology'", 5000, 'edit modal seeded');
  check('edit modal prefilled with name', true);
  await evalJs(
    cdp,
    sid,
    `(function () {
      var dialog = document.querySelector('[role="dialog"]');
      var headSel = dialog.querySelectorAll('select')[1];
      var opt = Array.from(headSel.options).find(function (o) { return o.textContent.indexOf('Dr. Head Smoke') >= 0; });
      var setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(headSel, opt.value);
      headSel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`
  );
  await evalJs(cdp, sid, "document.querySelector('[role=\"dialog\"] button[type=\"submit\"]').click()");
  await waitFor(cdp, sid, "document.body.innerText.includes('Dr. Head Smoke')", 10000, 'head assigned on profile');
  check('edit save → toast + head card shows Dr. Head Smoke', await evalJs(cdp, sid, "document.body.innerText.includes('Changes saved') && document.body.innerText.includes('Head doctor')"));

  /* ---------- delete ---------- */
  await goto(`${FRONTEND}/departments`);
  await waitFor(cdp, sid, `${ROW_COUNT_JS} === 3`, 10000, 'list reload 2');
  await evalJs(cdp, sid, "document.querySelector('button[aria-label=\"Delete Orthopedics\"]').click()");
  await waitFor(cdp, sid, "document.body.innerText.includes('Delete department?')", 5000, 'confirm dialog');
  await evalJs(cdp, sid, "Array.from(document.querySelectorAll('button')).find(function (b) { return b.textContent.trim() === 'Delete department'; }).click()");
  await waitFor(cdp, sid, `${ROW_COUNT_JS} === 2`, 10000, 'row removed');
  check('delete via confirm → count 3→2', true);
  check('delete toast shown', await evalJs(cdp, sid, "document.body.innerText.includes('Orthopedics deleted')"));

  /* ---------- doctor role RBAC ---------- */
  await evalJs(cdp, sid, 'localStorage.clear(); true');
  await goto(`${FRONTEND}/login`);
  await login(cdp, sid, DOCTOR);
  await waitFor(cdp, sid, "location.pathname === '/dashboard'", 10000, 'doctor lands on dashboard');
  check('doctor session lands on /dashboard', true);
  check('sidebar hides Departments for doctor', !(await evalJs(cdp, sid, "Boolean(document.querySelector('a[href=\"/departments\"]'))")));
  await goto(`${FRONTEND}/departments`);
  await waitFor(cdp, sid, "location.pathname === '/unauthorized'", 10000, 'doctor blocked');
  check('doctor visiting /departments → /unauthorized', await evalJs(cdp, sid, "document.body.innerText.includes('Access denied')"));

  /* ---------- exceptions ---------- */
  check('zero uncaught page exceptions', exceptions.length === 0, exceptions.join(' | '));

  console.log(`\n${results.length - failures}/${results.length} passed`);
  browserWs.close();
  chrome.kill();
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error('SMOKE ERROR:', e.message);
  process.exit(1);
});
