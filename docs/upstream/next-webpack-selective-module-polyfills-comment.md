# Next.js upstream comment draft: webpack parity for selective module polyfills

Target: [issue #86785](https://github.com/vercel/next.js/issues/86785) or [draft PR #88551](https://github.com/vercel/next.js/pull/88551)

## Comment

I reproduced this on Next.js 16.3.4 with a one-page App Router application and both the default webpack output and a `NormalModuleReplacementPlugin` control. The isolated fixture is independent of application dependencies.

For Next.js' documented default browser range (Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+), `URL.canParse` is the only API in the current module-polyfill file that is still absent from part of that range. Replacing the all-in-one module with that fallback produced:

| Initial JavaScript | Next default | URL-only compatibility |   Change |
| ------------------ | -----------: | ---------------------: | -------: |
| Requests           |            4 |                      4 |        0 |
| Raw                |    445,608 B |              444,322 B | −1,286 B |
| Gzip               |    131,222 B |              130,846 B |   −376 B |
| Brotli             |    109,235 B |              108,879 B |   −356 B |

The seven patterns listed by Chrome's Legacy JavaScript insight disappeared while a pre-document test that deleted native `URL.canParse` confirmed the replacement restored valid absolute and relative parsing and returned false for an invalid URL.

One attribution caveat may help interpret Lighthouse screenshots: the current DevTools detector does not measure the literal polyfill implementation. It maps the seven matches to a generic transitive core-js dependency graph. Against Next's 1,380-byte hand-written module, the detector estimated 43,785 raw bytes; DevTools then applied the containing chunk's compression ratio and displayed 12,107 transferred bytes. The physical module is 596 bytes at standalone gzip, and the measured application-level webpack saving was 298 encoded / 1,286 decoded bytes after retaining `URL.canParse`. The audit direction is valid, but its headline byte estimate is not the achievable Next.js delta.

Draft PR #88551 implements the more durable per-target, per-polyfill architecture in Turbopack. The remaining question is webpack parity: should its webpack client entry also consume the split polyfill files while webpack remains supported, or is the intended resolution Turbopack-only? PR #95726's all-or-nothing replacement could not express the default target correctly because `URL.canParse` is still required; using the split files from #88551 would avoid that limitation.

The minimal fixture, measurement script, application-level trace, and compatibility control are ready. I have not opened a duplicate issue or PR because #86785/#88551 already own the underlying change.
