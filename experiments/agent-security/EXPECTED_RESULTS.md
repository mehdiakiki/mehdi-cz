# Expected observations, not execution evidence

The commands in [README.md](README.md) are for the existing GitHub workflow,
using its configured runners. No local execution is authorized. A successful
selfcheck exits zero and prints a short observation; an unmet assertion exits
nonzero. The table describes what those assertions require, not recorded runs.

| Source | Required observations | What this does not establish |
| --- | --- | --- |
| `host_helper.py` | Fixed dummy traversal writes beside job; replacement picks a host-owned destination; Alice receives an artifact ID and downloads its contents; Bob cannot create/download it; oversized creation adds no file; expired download denied | A hostile actor cannot alter output-directory ancestors; real authentication, durability, retention, or safe active-content serving |
| `dns_policy.ts` | Denied hostname makes no lookup; empty, denied, mixed, and nonnumeric resolver answers make no connection; allowed response carries numeric connection host, original SNI/Host, verified TLS options, and path; redirects denied | Actual DNS/HTTPS traffic, certificate acceptance, transport time/output limits, or environment egress controls |
| `process_inheritance.py` | First JSON observation includes dummy token/text; reduced launch has null token and descriptor values | Same-identity file access, network isolation, Windows handle behavior, or bounded collection of arbitrary output |
| `argument_boundary.py` | Unsafe fixed shell string creates temporary marker; argument-array call does not; fixed argparse converter preserves semicolon, spaces, and `--help`; unsupported format rejected before launch | Another executable's option handling, executable safety, resource isolation, or input ownership |
| `capability_directory.rs` | Ordinary and space-containing names readable; missing, traversal, absolute-outside, and Unix outward-symlink reads fail | A scheduled link-swap race; confinement of arbitrary Rust that uses unrestricted filesystem APIs |
| `control_plane.ts` | Empty/missing/wrong credentials, wrong job, forbidden action, and extra body fields cause no inspection; allowed handler call inspects `job-a` once | HTTP parsing/transport, deployed reachability, credential generation/rotation, or a complete identity system |
| `capability_gate.ts` | First approved read returns README unchanged; forged export, another actor, and another input cause no effect; extra admin property is not forwarded; exact final effect list is two reads and no exports | A model was persuaded or resisted injection, answer truthfulness, or every service enforces the same grant |
| `job_timeout.py` | Leader retains its unreaped worker until parent acquires the pidfd and acknowledges readiness; leader-only wait leaves that known descendant running; normal completion, timeout, cancellation, and injected launcher error terminate it under group cleanup; each case prints its observation | Acquiring handles from arbitrary reported PIDs, detached sessions, supervisor death, arbitrary process trees, Windows jobs, or real cgroup enforcement |
| `job_state.py` | Same-owner jobs separated; wrong owner/stale generation/expiry denied; denial leaves three leases/two values; operator collection removes two leases/one value; live value remains; repeated cleanup removes nothing | Real filesystem deletion, concurrent transactional behavior, memory/hardware isolation, or production retention completion |
| `runtime_approval.rs` | Old runtime receives no new assignment; two existing jobs remain until completion records permit retirement; replacement accepts one; changed image/kernel/profile, stale observation, expired approval, and disabled admission deny starts | Package vulnerability assessment, actual inventory or patch installation, host attestation, real scheduling atomicity, or job termination |

The runtime package names are intentionally dummy identifiers. Matching one is
not a recommendation to install a particular upstream release. The operator
must use the deployed distribution/vendor's advisory and package evidence.

Capture actual stdout and the exact verified commit from GitHub CI. Keep any
failed or unsupported-platform result with the record instead of converting it
into a claimed pass. None of these examples reproduces a vendor exploit.
