# Next.js Route Handler compression: validation for the existing fix

Targets: [issue #98007](https://github.com/vercel/next.js/issues/98007) and
[PR #98044](https://github.com/vercel/next.js/pull/98044)

## Comment

I reproduced this on Next.js 16.3.4 with a minimal App Router fixture containing
three responses above the compression threshold:

- a prerendered page returning repeated HTML;
- a dynamic Route Handler returning 8,800 bytes of text and a custom `Vary`
  value;
- a static Route Handler returning a 21,264-byte real homepage snapshot.

With unmodified `next start`, the page was gzip-compressed. Both Route Handler
responses were sent as identity: 8,800 encoded bytes for the control and 21,264
encoded bytes for the homepage. This made a plain-HTML architecture trial look
artificially worse than the equivalent page response.

I then applied PR #98044's single-valued-header behavior locally and built a
fresh, separate fixture output. The results were:

| Response path         | Unmodified 16.3.4 | PR behavior |  Decoded | Patched encoded |
| --------------------- | ----------------- | ----------- | -------: | --------------: |
| Prerendered page      | gzip              | gzip        |  15.5 kB |         ~1.7 kB |
| Dynamic Route Handler | identity          | gzip        |  8,800 B |            81 B |
| Static HTML handler   | identity          | gzip        | 21,264 B |         5,685 B |

The dynamic handler deliberately emits `Vary: perf029-control`. After the fix,
that token remained present and `Accept-Encoding` was appended, so the
compression fix did not discard the existing multi-value header behavior.

The root cause matches the PR: `sendResponse()` appends an ordinary
single-valued `content-type`, and `NodeNextResponse.appendHeader()` materializes
it as an array. The compression middleware's compressibility check therefore
receives an array instead of a MIME-type string and skips compression. Setting
ordinary single-valued headers while retaining append semantics for
`set-cookie`, `vary`, and authentication challenges restores compression.

One validation detail may help other reporters: editing only
`next/dist/server/send-response.js` did not affect a freshly compiled App Route
in this setup. The webpack server compilation consumed the ESM implementation,
so I applied the same trial change to `next/dist/esm/server/send-response.js`
and used a new dist directory to avoid stale generated chunks. No dependency
modification is retained in the repository.

The real-content fixture, compression control, and deterministic artifact
measurement live in `experiments/next-content-delivery-floor/`. I have not
opened a duplicate patch because #98044 already implements the correction and
adds upstream coverage; this note is additional version-specific validation.
