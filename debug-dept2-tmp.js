/* TEMPORARY — debug details navigation. Removed after run. */
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FRONTEND = 'http://localhost:5173';
const DEBUG_PORT = 9337;
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
      } else if (msg.method) this.handlers.forEach((h) => h(msg));
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  on(h) { this.handlers.push(h); }
}

const evalJs = async (cdp, sid, expression) => {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sid);
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

async function main() {
  const userDataDir = path.join(os.tmpdir(), 'cdp-debug-dept2-' + Date.now());
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${userDataDir}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let wsUrl = null;
  for (let i = 0; i < 50 && !wsUrl; i++) {
    await sleep(200);
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json()).webSocketDebuggerUrl; } catch {}
  }
  const browserWs = new WebSocket(wsUrl);
  await new Promise((res) => browserWs.addEventListener('open', res));
  const cdp = new Cdp(browserWs);
  cdp.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') console.log('EXCEPTION:', m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  });
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: sid } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Runtime.enable', {}, sid);
  await cdp.send('Page.enable', {}, sid);

  await cdp.send('Page.navigate', { url: `${FRONTEND}/login` }, sid);
  await sleep(2000);
  await evalJs(cdp, sid, `(() => {
    var set = function (sel, val) {
      var el = document.querySelector(sel);
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('input[type=email]', 'admin@deptsmoke.example.com');
    set('input[type=password]', 'Admin123!');
    document.querySelector('button[type=submit]').click();
    return true;
  })()`);
  await sleep(2500);
  console.log('path after login:', await evalJs(cdp, sid, 'location.pathname'));

  await cdp.send('Page.navigate', { url: `${FRONTEND}/departments` }, sid);
  await sleep(2500);
  console.log('rows:', await evalJs(cdp, sid, "document.querySelectorAll('tbody tr td:first-child a').length"));
  const clicked = await evalJs(cdp, sid, `(() => {
    var link = Array.from(document.querySelectorAll('a')).find(function (a) { return a.textContent.trim() === 'Cardiology'; });
    if (!link) return 'NO LINK';
    var href = link.getAttribute('href');
    link.click();
    return 'clicked ' + href;
  })()`);
  console.log('click:', clicked);
  await sleep(2500);
  console.log('path after click:', await evalJs(cdp, sid, 'location.pathname'));
  const text = String(await evalJs(cdp, sid, 'document.body.innerText'));
  console.log('has Heart care unit:', text.includes('Heart care unit'));
  console.log('has Block A:', text.includes('Block A'));
  console.log('has No head:', text.includes('No head doctor assigned'));
  console.log('--- body text (last 1200 from the Departments point) ---');
  const idx = text.lastIndexOf('All departments');
  console.log(text.slice(idx >= 0 ? idx : 0, (idx >= 0 ? idx : 0) + 1200));

  browserWs.close();
  chrome.kill();
  process.exit(0);
}
main().catch((e) => { console.error('DEBUG ERROR:', e); process.exit(1); });
