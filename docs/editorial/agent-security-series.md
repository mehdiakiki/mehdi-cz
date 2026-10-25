# Agent security series

The author approved this series for daily publication on October 25, 2026. All ten sources now have `draft: false`, `reviewed: true`, and exact content review hashes. The [daily calendar](daily-publication-calendar.md) and [approval record](release-2026-10-25.json) record the active schedule.

Ten additional articles about how agent containment fails and how to reduce the
damage. Requested October 24, 2026. The writing uses the same plain, practical
voice as the engineering series. No invented first-hand incidents or claims of
human-only authorship.

Use “escape” precisely. A VM or container vulnerability, a privileged host-side
tool, an unrestricted network path, and a stolen credential cross different
boundaries. A toy demonstration of one must not be described as proof of another.

| Article | Demonstration | Protective technique |
| --- | --- | --- |
| [Prevent Path Traversal in Host Tools for AI Agents](../../data/blog/the-sandbox-stayed-closed-the-file-helper-did-not.mdx) | Python report writer using dummy job folders | A trusted job-owned destination instead of a model-chosen host path |
| [Reject Disallowed Hosts Before DNS in an Agent Egress Broker](../../data/blog/blocking-http-did-not-block-the-way-out.mdx) | TypeScript fake DNS and egress decisions | Enforce policy before resolution and cover resolver traffic |
| [Stop Secret Inheritance in Python Subprocesses](../../data/blog/the-child-process-inherited-the-secret.mdx) | Python subprocess with a dummy token and inherited descriptor | Minimal environment and explicit descriptor inheritance |
| [Prevent Shell Injection in Python Agent Tools](../../data/blog/a-filename-became-a-shell-command.mdx) | Python argument containing harmless shell syntax | A fixed executable and argument array without a shell |
| [Restrict Rust File Tools with cap-std Directory Capabilities](../../data/blog/the-safe-path-changed-before-it-was-opened.mdx) | Rust directory capability with a symlink pointing outside | Resolve file access through a pre-opened directory capability |
| [Local Agent Control APIs Need Job-Scoped Authorization](../../data/blog/localhost-is-not-an-admin-password.mdx) | TypeScript control API authorization with dummy tokens | Authenticate outside the agent and bind authorization to the job |
| [README Prompt Injection: Check Tool Permissions Before Effects](../../data/blog/the-readme-asked-for-a-different-job.mdx) | TypeScript tool gate with a forged export request | Grant capabilities from trusted user intent, not retrieved text |
| [Python Subprocess Timeouts and Descendant Cleanup](../../data/blog/the-timeout-ended-one-process-not-the-job.mdx) | Python bounded child process and cleanup code | Job-wide termination plus resource and output limits |
| [Isolate Agent Job State with Scoped Leases and Generations](../../data/blog/the-next-agent-read-the-previous-jobs-files.mdx) | Python job-scoped state and ownership checks | Separate state, leases, and cleanup between jobs |
| [Maintain the Container Runtime Behind an AI Sandbox](../../data/blog/sometimes-the-escape-is-in-the-runtime.mdx) | Rust operator-controlled runtime approval record | Patch the substrate and reject unapproved isolation profiles |

Each demonstration uses temporary fixtures, dummy tokens, or in-memory policy
calls. There are no external attack targets, real credential collection, reverse
shells, cloud operations, or privileged host escape payloads. A guard inside the
agent's own process is not an OS sandbox. Each article must explain that limit
where it affects the example.

Code is stored under `experiments/agent-security/`. Its bounded checks passed
GitHub CI verification; no demonstration has been run locally. Real CVE payloads
are not being reproduced. Kernel/runtime patching and network enforcement need
checks in the actual deployed environment in addition to these small examples.

This series occupies November 14–23 at 13:00 UTC in the approved [daily calendar](daily-publication-calendar.md), after the ten CI and ten engineering articles. The author approved removal of the draft and review holds on October 25. Date-stamped research claims retain their stated observation dates; they are not claims of fresh incident verification on a future publication day.

## Research notes and claim limits

- [OpenAI, October 23, 2026](https://openai.com/index/securing-our-frontier-model-training-environment/): reports internal red-team findings involving VM escapes, network paths, and cross-task communication. These were adversarial research environments; do not turn them into a claim about every customer sandbox or a population-wide escape rate.
- [Anthropic, September 9, 2026](https://www.anthropic.com/research/alignment-assessment-cybersecurity-incidents): discusses four incidents of unauthorized access and the limits of transcript review. The selected transcript count is not a denominator for a general incident rate.
- [Microsoft, May 7, 2026](https://www.microsoft.com/en-us/security/blog/2026/05/07/prompts-become-shells-rce-vulnerabilities-ai-agent-frameworks/): explains host-side file helpers and unsafe expression evaluation in Semantic Kernel. Different CVEs affect different SDKs and versions; the toy report helper is not the vendor exploit.
- [BeyondTrust, March 16 disclosure with April 22 update](https://www.beyondtrust.com/blog/entry/pwning-aws-agentcore-code-interpreter): documents DNS traffic in AgentCore's sandbox mode. The updated report says DNS tunneling was remediated in April. Do not repeat the older “unpatched” claim.
- [runc June 13, 2026 advisory](https://github.com/opencontainers/runc/security/advisories/GHSA-xjvp-4fhw-gc47): describes limited host filesystem integrity effects, rated low. Do not call it a full host takeover.
- [runc November 5, 2025 advisory](https://github.com/opencontainers/runc/security/advisories/GHSA-qw9x-cqr3-wc7r): documents a different, high-severity escape class and affected/fixed releases. Historical fixes are not a recommendation to install an old version in October 2026.
- [MCP draft security guidance](https://modelcontextprotocol.io/docs/draft/tutorials/security/security_best_practices): useful for authorization, token audience, and state-handle risks; identify it as draft guidance where relevant.

The draft examples and their prose must be checked together before publication.
No current incident or vendor remediation status should be inferred from a
headline alone. Refresh time-sensitive claims when each article is released.

The [review record](new-series-review-2026-10-24.md) documents corrections to the
token and job-state examples and the limits retained in each article. It is an
inspection report, not execution evidence or publication approval.

The later [review of all thirty drafts](all-articles-editorial-review-2026-10-24.md)
records the additional source and style check, including simpler descriptions
and removal of drafting narration from the articles.

The [adversarial length and search review](article-length-seo-review-2026-10-24.md)
identifies three strong cores, three revisions, and four major revisions here.
In particular, an accurate explanation of a demonstration's limits does not
complete the broader prevention answer promised by some current titles.
