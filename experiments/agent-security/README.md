# Agent security demonstration fixtures

These ten small demonstrations accompany the held agent security drafts. They
show boundary checks using dummy data, temporary folders, and fake network
functions. They are not reproductions of the cited vendor CVEs or a complete
agent sandbox. No demonstration has been executed or compiled locally.

| Article technique | Source |
| --- | --- |
| Host chooses a report destination; creation/download check the owner | [host_helper.py](host_helper.py) |
| Check hostname before DNS; validate addresses and inspect real Node HTTPS options | [dns_policy.ts](dns_policy.ts) |
| Exclude environment and descriptor inheritance | [process_inheritance.py](process_inheritance.py) |
| Keep arguments out of a shell and preserve leading options as filename data | [argument_boundary.py](argument_boundary.py) |
| Use a directory capability in the trusted file tool | [capability_directory.rs](rust/src/bin/capability_directory.rs) |
| Trace credential parsing and authorization to one fake inspection effect | [control_plane.ts](control_plane.ts) |
| Trace a constructed README proposal through the gate to the fake data service | [capability_gate.ts](capability_gate.ts) |
| Observe one bounded descendant after leader-only wait and group cleanup | [job_timeout.py](job_timeout.py) |
| Scope state by current job/generation, then collect expired state as operator | [job_state.py](job_state.py) |
| Model runtime inventory admission, draining, and replacement | [runtime_approval.rs](rust/src/bin/runtime_approval.rs) |

For GitHub CI verification, use the project's existing workflow and runner
selection. Do not run these commands on the workstation:

```sh
python3 experiments/agent-security/host_helper.py
python3 experiments/agent-security/process_inheritance.py
python3 experiments/agent-security/argument_boundary.py
python3 experiments/agent-security/job_timeout.py
python3 experiments/agent-security/job_state.py
node experiments/agent-security/dns_policy.ts
node experiments/agent-security/control_plane.ts
node experiments/agent-security/capability_gate.ts
cargo run --manifest-path experiments/agent-security/rust/Cargo.toml --bin capability_directory
cargo run --manifest-path experiments/agent-security/rust/Cargo.toml --bin runtime_approval
```

Python inheritance and shell examples target POSIX. The timeout selfcheck
requires Linux >=5.3, Python >=3.9 with `os.pidfd_open`,
`signal.pidfd_send_signal`, and `waitid(WNOWAIT)`. It fails rather than silently
skipping descendant observations when those interfaces are unavailable.
TypeScript requires
a Node version with built-in type stripping, such as the existing CI's Node 24.
The Rust dependency is pinned directly, and its reviewed CI-generated lockfile
is retained for locked verification.

DNS and control API examples never open sockets. File examples only touch their
own temporary fixture. The shell demonstration creates one harmless marker in
that fixture. No real keys, customer files, container daemons, cloud resources,
external resolvers, vulnerable runtimes, or privileged exploit payloads are used.

The process-group helper cleans up after normal leader exit, timeout,
cancellation, and an injected launcher exception. It cannot contain descendants
that detach into another session or continue cleanup after the supervisor
itself is killed. The deployed supervisor/cgroup boundary remains independent
of these checks. The example makes no cgroup changes and opens no sockets.
Application checks cannot confine arbitrary code that bypasses them.

The timeout selfcheck runs five sequential cases, each with one fixed leader
and one eight-second sleeper. A bounded readiness message precedes the measured
wait. A pidfd observes the known descendant's termination (possibly an unreaped
zombie); it does not prove that an arbitrary job boundary is empty. The
leader-only contrast deliberately leaves the sleeper running long enough to
observe it, then terminates it through the known pidfd. Every case has cleanup
backstops; there are no detached processes or stress loops.

The directory selfcheck checks an existing outward symlink, not a scheduled
symlink-swap race. The DNS selfcheck captures real Node HTTPS option objects but
never calls `https.request`, validates a certificate chain, or checks deployed
network policy. Its fake response strings are fixed and small; a production
adapter must enforce request deadlines and streamed byte limits itself.

The README trace supplies model proposals directly. It does not measure model
behavior or prompt-injection success rates. The control handler accepts already
parsed HTTP-shaped values; it is not an HTTP parser, server, or identity
framework. The state cleanup is single-threaded and in-memory; persistent
storage requires an atomic expiry/generation check and deletion. The runtime
example uses dummy package identifiers and completion records: it does not
inspect, update, stop, or attest a real host.

[EXPECTED_RESULTS.md](EXPECTED_RESULTS.md) maps each selfcheck to its expected
observations and residual limits. These are assertion specifications, not a
record that execution passed. Record the actual GitHub run URL, exact commit,
stdout, exit status, and any platform failures in the editorial verification
record after remote execution. Match article source links to that verified
commit before release.

## Recorded verification

[GitHub CI run 40134144275](https://github.com/mehdiakiki/mehdi-cz/actions/runs/40134144275) passed for PR head `aa3ea07386d828fda077d626020d6ca7565aa5e0` merged with its base. The [verification record](../../docs/editorial/evidence/length-seo-2026-10-24/verification.json) names the actual checkout and fixture hashes, with preserved stdout beside it. This verifies the bounded checks described here, without extending their stated limits. The articles remain held.
