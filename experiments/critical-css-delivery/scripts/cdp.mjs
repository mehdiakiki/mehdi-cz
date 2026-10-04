export const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class Cdp {
  id = 0;
  pending = new Map();
  listeners = new Set();

  async connect() {
    const endpoint = process.env.PERF051_DEBUGGER || "http://127.0.0.1:9250/json/version";
    const version = await fetch(endpoint).then((response) => response.json());
    this.version = version.Browser;
    this.socket = new WebSocket(version.webSocketDebuggerUrl);
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
    await new Promise((resolveOpen, rejectOpen) => {
      this.socket.addEventListener("open", resolveOpen, { once: true });
      this.socket.addEventListener("error", rejectOpen, { once: true });
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolveResult, rejectResult) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rejectResult(new Error(`Timeout: ${method}`));
      }, 60_000);
      this.pending.set(id, { resolve: resolveResult, reject: rejectResult, method, timer });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  wait(method, sessionId, timeout = 60_000) {
    return new Promise((resolveEvent, rejectEvent) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        rejectEvent(new Error(`Timeout: ${method}`));
      }, timeout);
      const listener = (message) => {
        if (message.method !== method || message.sessionId !== sessionId) return;
        clearTimeout(timer);
        this.listeners.delete(listener);
        resolveEvent(message.params);
      };
      this.listeners.add(listener);
    });
  }

  async page(profile) {
    const { browserContextId } = await this.send("Target.createBrowserContext");
    const { targetId } = await this.send("Target.createTarget", {
      url: "about:blank",
      browserContextId,
    });
    const { sessionId } = await this.send("Target.attachToTarget", { targetId, flatten: true });
    const send = (method, params) => this.send(method, params, sessionId);
    await Promise.all(["Page.enable", "Runtime.enable", "Network.enable"].map((method) => send(method)));
    await send("Page.bringToFront");
    await send("Emulation.setDeviceMetricsOverride", profile);
    await send("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-color-scheme", value: "light" },
        { name: "prefers-reduced-motion", value: "no-preference" },
      ],
    });
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    return {
      sessionId,
      send,
      evaluate,
      navigate: async (url) => {
        const loaded = this.wait("Page.loadEventFired", sessionId);
        const response = await send("Page.navigate", { url });
        if (response.errorText) throw new Error(response.errorText);
        await loaded;
      },
      close: () => this.send("Target.disposeBrowserContext", { browserContextId }),
    };
  }

  close() {
    this.socket.close();
  }
}

