import http from "node:http";

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function copyHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([name, value]) => value !== undefined && !hopByHopHeaders.has(name)
    )
  );
}

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function createTransportShapingProxy({
  upstreamBaseUrl = "http://127.0.0.1:3120",
  tickMs = 25,
} = {}) {
  const upstream = new URL(upstreamBaseUrl);
  let run = null;
  let nextRequestId = 0;
  let byteCarry = 0;
  const ready = [];
  const pendingTimers = new Set();
  const upstreamRequests = new Set();

  function removeReady(entry) {
    const index = ready.indexOf(entry);
    if (index !== -1) ready.splice(index, 1);
  }

  function cancelEntry(entry) {
    if (entry.completed || entry.cancelled) return;
    entry.cancelled = true;
    entry.finishedAt = Date.now();
    removeReady(entry);
    if (entry.timer) {
      clearTimeout(entry.timer);
      pendingTimers.delete(entry.timer);
      entry.timer = null;
    }
    entry.upstreamRequest?.destroy();
  }

  function setEntryTimer(entry, delayMs, callback) {
    const timer = setTimeout(() => {
      pendingTimers.delete(timer);
      if (entry.timer === timer) entry.timer = null;
      callback();
    }, delayMs);
    entry.timer = timer;
    pendingTimers.add(timer);
  }

  function writeEntryBody(entry, endOffset) {
    const length = endOffset - entry.offset;
    if (length <= 0) return;
    if (entry.firstBodyAt === null) entry.firstBodyAt = Date.now();
    entry.response.write(entry.body.subarray(entry.offset, endOffset));
    entry.offset = endOffset;
    entry.sentBodyBytes += length;
  }

  function finishEntry(entry) {
    entry.completed = true;
    entry.finishedAt = Date.now();
    removeReady(entry);
    entry.response.end();
  }

  function startDedicatedArticleDelivery(entry, mode, earlyPrefixBytes) {
    entry.deliveryMode =
      mode === "prefix" ? `article-prefix-${earlyPrefixBytes}` : `article-${mode}`;
    if (entry.body.length === 0) {
      finishEntry(entry);
      return;
    }

    const bytesPerSecond = (run.profile.downloadKbps * 1_000) / 8;
    const transferMs = Math.max(tickMs, (entry.body.length / bytesPerSecond) * 1_000);
    entry.scheduledCompletionAt = entry.headersAt + transferMs;

    if (mode === "prefix") {
      setEntryTimer(entry, Math.min(tickMs, transferMs), () => {
        if (entry.cancelled || entry.response.destroyed) {
          cancelEntry(entry);
          return;
        }
        const prefixLength = Math.min(earlyPrefixBytes, Math.max(0, entry.body.length - 1));
        entry.actualEarlyPrefixBytes = prefixLength;
        writeEntryBody(entry, prefixLength);
        setEntryTimer(entry, Math.max(1, entry.scheduledCompletionAt - Date.now()), () => {
          if (entry.cancelled || entry.response.destroyed) {
            cancelEntry(entry);
            return;
          }
          writeEntryBody(entry, entry.body.length);
          finishEntry(entry);
        });
      });
      return;
    }

    if (mode === "burst") {
      setEntryTimer(entry, transferMs, () => {
        if (entry.cancelled || entry.response.destroyed) {
          cancelEntry(entry);
          return;
        }
        writeEntryBody(entry, entry.body.length);
        finishEntry(entry);
      });
      return;
    }

    const pump = () => {
      if (entry.cancelled || entry.response.destroyed) {
        cancelEntry(entry);
        return;
      }
      const elapsed = Date.now() - entry.headersAt;
      const fraction = Math.min(1, elapsed / transferMs);
      const endOffset =
        fraction === 1 ? entry.body.length : Math.floor(entry.body.length * fraction);
      writeEntryBody(entry, endOffset);
      if (entry.offset === entry.body.length) {
        finishEntry(entry);
        return;
      }
      setEntryTimer(entry, Math.min(tickMs, Math.max(1, transferMs - elapsed)), pump);
    };
    setEntryTimer(entry, Math.min(tickMs, transferMs), pump);
  }

  const scheduler = setInterval(() => {
    if (!run || ready.length === 0) return;
    const bytesPerSecond = (run.profile.downloadKbps * 1_000) / 8;
    const exactBudget = (bytesPerSecond * tickMs) / 1_000 + byteCarry;
    let budget = Math.floor(exactBudget);
    byteCarry = exactBudget - budget;

    while (budget > 0 && ready.length > 0) {
      const share = Math.max(1, Math.floor(budget / ready.length));
      for (const entry of [...ready]) {
        if (budget <= 0) break;
        if (entry.response.destroyed || entry.cancelled) {
          cancelEntry(entry);
          continue;
        }
        const remaining = entry.body.length - entry.offset;
        const length = Math.min(remaining, share, budget);
        if (length > 0) writeEntryBody(entry, entry.offset + length);
        budget -= length;
        if (entry.offset === entry.body.length) finishEntry(entry);
      }
    }
  }, tickMs);
  scheduler.unref();

  const server = http.createServer((request, response) => {
    if (!run) {
      response.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
      response.end("PERF-032 proxy has no active run");
      return;
    }

    const requestUrl = new URL(request.url || "/", upstream);
    const isArticleDocument = /\/article$/.test(requestUrl.pathname);
    if (isArticleDocument) run.targetPhase = true;
    const shaped = run.targetPhase;
    const entry = {
      id: ++nextRequestId,
      method: request.method,
      url: `${requestUrl.pathname}${requestUrl.search}`,
      purpose: request.headers.purpose || null,
      secPurpose: request.headers["sec-purpose"] || null,
      secFetchDest: request.headers["sec-fetch-dest"] || null,
      phase: shaped ? "target" : "source",
      status: null,
      requestedAt: Date.now(),
      headersAt: null,
      finishedAt: null,
      firstBodyAt: null,
      scheduledCompletionAt: null,
      actualEarlyPrefixBytes: 0,
      plannedBodyBytes: null,
      sentBodyBytes: 0,
      completed: false,
      cancelled: false,
      body: null,
      offset: 0,
      response,
      timer: null,
      upstreamRequest: null,
      deliveryMode: shaped ? "aggregate-progressive" : "unshaped",
    };
    run.requests.push(entry);

    response.on("close", () => {
      if (!entry.completed) cancelEntry(entry);
    });

    const forwardedHeaders = copyHeaders(request.headers);
    forwardedHeaders.host = upstream.host;
    const upstreamRequest = http.request(
      {
        protocol: upstream.protocol,
        hostname: upstream.hostname,
        port: upstream.port,
        method: request.method,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        headers: forwardedHeaders,
      },
      (upstreamResponse) => {
        entry.status = upstreamResponse.statusCode || 502;
        const responseHeaders = copyHeaders(upstreamResponse.headers);

        if (!shaped) {
          entry.headersAt = Date.now();
          response.writeHead(entry.status, responseHeaders);
          upstreamResponse.on("data", (chunk) => {
            entry.sentBodyBytes += chunk.length;
          });
          upstreamResponse.on("end", () => {
            entry.plannedBodyBytes = entry.sentBodyBytes;
            if (!entry.cancelled) {
              entry.completed = true;
              entry.finishedAt = Date.now();
            }
          });
          upstreamResponse.pipe(response);
          return;
        }

        const chunks = [];
        let bodyLength = 0;
        upstreamResponse.on("data", (chunk) => {
          chunks.push(chunk);
          bodyLength += chunk.length;
        });
        upstreamResponse.on("end", () => {
          entry.body = Buffer.concat(chunks, bodyLength);
          entry.plannedBodyBytes = bodyLength;
          if (entry.cancelled) return;
          const elapsed = Date.now() - entry.requestedAt;
          const remainingLatency = Math.max(0, run.profile.latencyMs - elapsed);
          setEntryTimer(entry, remainingLatency, () => {
            if (entry.cancelled || response.destroyed) {
              cancelEntry(entry);
              return;
            }
            entry.headersAt = Date.now();
            response.writeHead(entry.status, responseHeaders);
            if (isArticleDocument && run.articleDeliveryMode !== "aggregate") {
              startDedicatedArticleDelivery(
                entry,
                run.articleDeliveryMode,
                run.articleEarlyPrefixBytes
              );
            } else if (entry.body.length === 0) finishEntry(entry);
            else ready.push(entry);
          });
        });
      }
    );
    entry.upstreamRequest = upstreamRequest;
    upstreamRequests.add(upstreamRequest);
    upstreamRequest.once("close", () => upstreamRequests.delete(upstreamRequest));
    upstreamRequest.on("error", (error) => {
      if (entry.cancelled) return;
      entry.status = 502;
      entry.plannedBodyBytes = Buffer.byteLength(error.message);
      entry.sentBodyBytes = entry.plannedBodyBytes;
      entry.completed = true;
      entry.finishedAt = Date.now();
      if (!response.headersSent) response.writeHead(502, { "content-type": "text/plain" });
      response.end(error.message);
    });
    request.pipe(upstreamRequest);
  });

  return {
    async listen(port = 3132, hostname = "127.0.0.1") {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, hostname, () => {
          server.off("error", reject);
          resolve();
        });
      });
      return server.address();
    },

    reset({ runId, profile, articleDeliveryMode = "aggregate", articleEarlyPrefixBytes = 0 }) {
      if (!runId) throw new Error("A runId is required");
      if (!(profile?.latencyMs >= 0) || !(profile?.downloadKbps > 0)) {
        throw new Error(
          "A profile with non-negative latencyMs and positive downloadKbps is required"
        );
      }
      if (!["aggregate", "progressive", "burst", "prefix"].includes(articleDeliveryMode)) {
        throw new Error("articleDeliveryMode must be aggregate, progressive, burst, or prefix");
      }
      if (
        (articleDeliveryMode === "prefix" &&
          ![1024, 2048, 4096, 8192].includes(articleEarlyPrefixBytes)) ||
        (articleDeliveryMode !== "prefix" && articleEarlyPrefixBytes !== 0)
      ) {
        throw new Error(
          "articleEarlyPrefixBytes must be 1024, 2048, 4096, or 8192 only in prefix mode"
        );
      }
      if (ready.length || pendingTimers.size) {
        throw new Error("Cannot reset the PERF-032 proxy while a shaped response is active");
      }
      byteCarry = 0;
      run = {
        runId,
        profile: { ...profile },
        articleDeliveryMode,
        articleEarlyPrefixBytes,
        startedAt: Date.now(),
        targetPhase: false,
        requests: [],
      };
    },

    snapshot() {
      if (!run) return null;
      const requests = run.requests.map(({ response, body, timer, upstreamRequest, ...entry }) => ({
        ...entry,
        requestToHeadersMs:
          entry.headersAt === null ? null : round(entry.headersAt - entry.requestedAt),
        durationMs: entry.finishedAt === null ? null : round(entry.finishedAt - entry.requestedAt),
        firstBodyMs:
          entry.firstBodyAt === null ? null : round(entry.firstBodyAt - entry.requestedAt),
        bodySpanMs:
          entry.firstBodyAt === null || entry.finishedAt === null
            ? null
            : round(entry.finishedAt - entry.firstBodyAt),
        scheduledCompletionMs:
          entry.scheduledCompletionAt === null
            ? null
            : round(entry.scheduledCompletionAt - entry.requestedAt),
      }));
      const targetRequests = requests.filter((entry) => entry.phase === "target");
      const articleRequests = targetRequests.filter((entry) => /\/article(?:\?|$)/.test(entry.url));
      return {
        runId: run.runId,
        profile: run.profile,
        articleDeliveryMode: run.articleDeliveryMode,
        articleEarlyPrefixBytes: run.articleEarlyPrefixBytes,
        targetPhase: run.targetPhase,
        target: {
          requests: targetRequests.length,
          completed: targetRequests.filter((entry) => entry.completed).length,
          cancelled: targetRequests.filter((entry) => entry.cancelled).length,
          plannedBodyBytes: targetRequests.reduce(
            (total, entry) => total + (entry.plannedBodyBytes || 0),
            0
          ),
          sentBodyBytes: targetRequests.reduce((total, entry) => total + entry.sentBodyBytes, 0),
          articleRequests: articleRequests.length,
          articlePlannedBodyBytes: articleRequests.reduce(
            (total, entry) => total + (entry.plannedBodyBytes || 0),
            0
          ),
          articleSentBodyBytes: articleRequests.reduce(
            (total, entry) => total + entry.sentBodyBytes,
            0
          ),
          articleRequestDetails: articleRequests.map((entry) => ({
            status: entry.status,
            purpose: entry.purpose,
            secPurpose: entry.secPurpose,
            secFetchDest: entry.secFetchDest,
            deliveryMode: entry.deliveryMode,
            requestToHeadersMs: entry.requestToHeadersMs,
            firstBodyMs: entry.firstBodyMs,
            bodySpanMs: entry.bodySpanMs,
            durationMs: entry.durationMs,
            scheduledCompletionMs: entry.scheduledCompletionMs,
            actualEarlyPrefixBytes: entry.actualEarlyPrefixBytes,
            plannedBodyBytes: entry.plannedBodyBytes,
            sentBodyBytes: entry.sentBodyBytes,
            completed: entry.completed,
            cancelled: entry.cancelled,
          })),
        },
        requests,
      };
    },

    async close() {
      clearInterval(scheduler);
      for (const timer of pendingTimers) clearTimeout(timer);
      pendingTimers.clear();
      for (const upstreamRequest of upstreamRequests) upstreamRequest.destroy();
      server.closeIdleConnections?.();
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    },
  };
}
