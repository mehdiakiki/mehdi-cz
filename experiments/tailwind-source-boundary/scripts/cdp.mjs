export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export class Cdp {
  id = 0; pending = new Map(); listeners = new Set();
  async connect() {
    const version = await fetch(process.env.PERF050_DEBUGGER || 'http://127.0.0.1:9250/json/version').then(r => r.json());
    this.version = version.Browser;
    this.ws = new WebSocket(version.webSocketDebuggerUrl);
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const p = this.pending.get(message.id); if (!p) return;
        clearTimeout(p.timer); this.pending.delete(message.id);
        message.error ? p.reject(new Error(`${p.method}: ${message.error.message}`)) : p.resolve(message.result);
      } else for (const listener of this.listeners) listener(message);
    });
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 60000);
      this.pending.set(id, { resolve, reject, method, timer });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  wait(method, sessionId, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.listeners.delete(listener); reject(new Error(`Timeout: ${method}`)); }, timeout);
      const listener = m => {
        if (m.method !== method || m.sessionId !== sessionId) return;
        clearTimeout(timer); this.listeners.delete(listener); resolve(m.params);
      };
      this.listeners.add(listener);
    });
  }
  async page(profile = 'mobile', throttled = false) {
    const { browserContextId } = await this.send('Target.createBrowserContext');
    const { targetId } = await this.send('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
    const send = (method, params) => this.send(method, params, sessionId);
    await Promise.all(['Page.enable', 'Runtime.enable', 'Network.enable'].map(method => send(method)));
    await send('Page.bringToFront');
    await send('Emulation.setDeviceMetricsOverride', profile === 'mobile'
      ? { width: 390, height: 844, deviceScaleFactor: 2.75, mobile: true }
      : { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    if (throttled) {
      await send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await send('Network.emulateNetworkConditions', { offline: false, latency: 150,
        downloadThroughput: 1600000 / 8, uploadThroughput: 750000 / 8, connectionType: 'cellular4g' });
    }
    const evaluate = async expression => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    return { sessionId, send, evaluate,
      navigate: async url => { const loaded = this.wait('Page.loadEventFired', sessionId); const r = await send('Page.navigate', { url }); if (r.errorText) throw new Error(r.errorText); await loaded; },
      close: () => this.send('Target.disposeBrowserContext', { browserContextId }),
    };
  }
  close() { this.ws.close(); }
}
export const routes = [
  ['home', '/'], ['index', '/blog'], ['prose', '/blog/async-rust-libraries'],
  ['code', '/blog/load-balancer-sticky-sessions-course'], ['atlas', '/rust-failure-atlas'],
];
