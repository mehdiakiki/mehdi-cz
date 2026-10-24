# Language review of the ten CI and agent drafts

This is an AI editor's review for human readers, not a claim of human review.
I read all ten drafts in full. This report describes the original drafts before
the current rewrites. It covers language and story flow, not technical
validation or publication approval. No checks were run or metadata locks changed.

## Series-wide diagnosis

The English is understandable. The robotic feel comes mainly from repetition:
an invented incident, a disclaimer, balanced advice, then a paragraph explaining
what the story has taught us. Across ten articles, that structure becomes obvious.

- Label fiction once per article. Remove later reminders that the example,
  report, or developer is illustrative. Keep source limits that prevent a
  specific misunderstanding.
- Give sentences people and actions: “compare the old failure with the new
  code,” instead of “acquired reconciliation work.”
- Replace vague “boundaries,” “evidence,” and “meaningful results” with the
  parser, commit, assertion, deployment, or page actually being discussed.
- Cut defenses against claims the article never makes. An invented team needs
  no further disclaimer about hidden throughput figures.
- End with what the developer does or observes. Avoid another “At the end of
  this story” or a general lesson about green badges.

The shared importer gives continuity. Keep it, but avoid explaining the full
first-occurrence requirement again whenever the real topic is queues or reviews.

## 1. The Agent Finished. The Pipeline Was Still Waiting.

File: `data/blog/the-agent-finished-the-pipeline-did-not.mdx`

The opening works. The explanation becomes more formal than the scene requires.

- **Before:** “This is an illustrative morning, not a measured productivity
  study.” **Edit:** Label the opening “In this fictional example” and cut this
  second disclaimer. Keep the mismatch: the next patch is ready before CI has
  answered whether the first works.
- **Before:** “The developer has acquired reconciliation work before receiving
  the original result.” **After:** “Now the developer has to compare an old
  failure with newer code before deciding what to fix.”
- **Before:** “Neither requires pretending that developers should sit
  motionless beside a progress bar.” **Edit:** Cut this imaginary objection.
  The preceding examples already show what to do while waiting.
- **Before:** “At the end of the imagined morning, the best outcome is modest.”
  **After:** “When the result arrives, the importer patch is still small enough
  to explain. The developer knows which commit passed and what remains to check.”

**Preserve:** an early focused result does not replace required integration checks.

## 2. The Build Was Green. Nobody Had Agreed What Correct Meant.

File: `data/blog/the-build-was-green-and-nobody-understood-the-change.mdx`

The disagreement about which name survives is stronger than the commentary
introducing it.

- **Before:** “Here is a fictional review with an ordinary ending.” **Edit:**
  Open with “Shouldn't we keep the first one?” Then identify the review as
  invented once and explain the agent's last-occurrence choice.
- **Before:** “Agreement between the two is not independent evidence that the
  interpretation matches what the application needs.” **After:** “Code and
  tests can make the same wrong choice. Their agreement does not tell us which
  choice the product needs.”
- **Before:** “It becomes an acceptance condition that the implementation must
  satisfy, rather than an explanation reconstructed from whatever the
  implementation happens to do.” **After:** “Now the expected result is written
  down before the repair. The code has to match that decision.”
- **Before:** “The valuable unit is a duplicate policy carried through to the
  preview.” **After:** “Review the duplicate rule and the preview that shows it
  together.” Keep the DORA attribution and warning against disconnected changes.

**Preserve:** first-wins and last-wins can both be valid. Leaving the choice
unstated is the mistake.

## 3. The Agent Made the Flaky Test Green by Removing the Question

File: `data/blog/the-agent-made-the-flaky-test-green.mdx`

The before-and-after snippets make this one readable. Reduce interruptions.

- **Before:** “The patch has achieved something close to its literal
  objective.” **After:** “The agent has made the test pass by making it weaker.”
- **Before:** “The page labels and API route are illustrative; this is not an
  executed fixture from this repository.” **After:** “The existing test waits
  half a second, then counts the warnings.” The opening already labels the test
  invented; the snippet contains no API route.
- **Before:** “A more useful assertion waits for the expected observable result
  within a bound.” **After:** “Let the assertion wait until the expected result
  appears or the timeout expires.”
- **Before:** “It is a historical account from Google's environment, not a
  prevalence estimate for a team using agents today.” **Edit:** Keep the Google
  attribution and cut this sentence. No prevalence estimate is being offered.

**Preserve:** two warnings need to be the correct warnings. A successful click
does not prove the server finished. Reruns can still miss a rare race.

## 4. Every New Commit Cancelled the Check That Mattered

File: `data/blog/every-new-commit-cancelled-the-check-that-mattered.mdx`

The lunchtime scene is clear. Later paragraphs repeatedly explain the same delay.

- **Before:** “Cancellation buys resources with discarded work.” **After:**
  “What cancellation saves, and what it throws away.”
- **Before:** “Those observations distinguish a reasonable cancellation policy
  from a workflow being constantly interrupted by its own contributors.”
  **After:** “The run history shows whether cancellation is saving work or
  repeatedly stopping the check before it finishes.”
- **Before:** “Let a coherent revision finish its required validation before
  asking for further improvements.” **After:** “Let the current change finish
  its required checks before adding another cleanup commit.”
- **Before:** “In this story, the eventual improvement is almost boring.”
  **Edit:** Cut the setup. Finish with batched cosmetic edits, a completed
  integration check, and an active deployment allowed to finish.

**Preserve:** `cancel-in-progress: false` protects the running deployment from
this rule; it does not guarantee every pending run executes. Cancellation does
not undo deployment side effects.

## 5. The Test Passed on the Wrong Commit

File: `data/blog/the-test-passed-on-the-wrong-commit.mdx`

Keep the newer commits in view instead of explaining the grammar of “passed.”

- **Before:** “A result needs a subject” and “Conversationally we supply the
  subject ourselves.” **After:** “Name the commit that passed.” Then: “The
  handoff should name that commit and the checks that ran. Otherwise the
  reviewer has to guess whether the result applies to the current patch.”
- **Before:** “A small provenance step can help.” **After:** “Print the
  checked-out commit in the job log.” Leave the command unchanged.
- **Before:** “It does not require a new attestation system for every small
  change.” **After:** “Often the workflow URL, commit link, and uploaded artifact
  are enough to show what was checked.” Avoid introducing jargon just to deny
  that readers need it.
- **Before:** “‘This wording change does not require rerunning the parser suite
  under our policy’ is an assessable decision.” **After:** “If the repository
  lets a wording-only change skip the parser suite, say so. Do not describe the
  new commit as tested when it was not.”

**Preserve:** the PR head and tested merge revision can differ. Identify the
actual checkout and the revision that produced the artifact.

## 6. The Cache Made the Build Fast and Wrong

File: `data/blog/the-cache-made-the-build-fast-and-wrong.mdx`

Keep the distinction from the real incident; simplify the language about inputs.

- **Before:** “This opening is an illustrative failure, not a report that this
  site's cache caused its recent deployment incident.” **After:** “This cache
  failure is invented. The site's real deployment failure later in this series
  was a disk-space problem.” This fiction label serves a specific purpose.
- **Before:** “Those two builds are allowed to differ even when Git has nothing
  new to show.” **After:** “An approved article scheduled for 10:00 should be
  hidden at 09:59 and visible at 10:00, even if the commit is the same.”
- **Before:** “Threading that value through every production surface
  consistently.” **After:** “Pages, lists, search, and the sitemap would all need
  to use the same cutoff.” Keep this as a possible design, not an existing feature.
- **Before:** “The example has no measured speedup, and none is necessary to see
  the correctness issue.” **Edit:** Cut the defense against an unmade performance
  claim. Keep the request to explain inputs and show a check that catches omissions.

**Preserve:** `PUBLICATION_BUILD_ID` invalidates cache; it does not supply the
publication time. A correct registry artifact is not yet a correctly served site.

## 7. One Changed Package, One Entire Afternoon of Tests

File: `data/blog/the-monorepo-ran-every-test-for-a-small-change.mdx`

The package diagram works. Selection and required-check wording becomes dense.

- **Before:** “The useful boundary is not the number of files in the diff. It is
  the set of behaviors that the change can affect.” **After:** “A small diff can
  still affect both applications. Check the formatter and the code that uses it.”
  Retain the repository's other required checks.
- **Before:** “The arrows above describe consumers, not a build tool's exact
  graph syntax.” **Edit:** Cut it; the block is already plain text. Use
  “applications that use the package” where “consumers” becomes repetitive.
- **Before:** “An honest required result for the selection process and the
  checks it chose.” **After:** “The required result must reflect both the
  selector and the checks it selected. It must fail if either fails.” Retain
  the branch-protection and workflow-structure qualifications.
- **Before:** “Without appointing a directory name as the definition of
  correctness.” **After:** “The developer gets the formatter result early and
  knows why the two applications still need checks.”

**Preserve:** a path filter alone does not infer dependencies. Skipped workflows
and skipped jobs have different reporting. Selector errors must not select nothing.

## 8. The Build Got Faster. The Review Queue Kept Growing.

File: `data/blog/the-review-queue-outgrew-the-build-queue.mdx`

Stay with the growing queue and remove the defensive framing.

- **Before:** “This is a fictional team, with no throughput figures hidden
  behind the story.” **After:** Label fiction once in the opening, then write
  “More pull requests arrive than the reviewers can finish.”
- **Before:** “When the agent's output becomes the unit of progress, those
  obligations can look like obstacles placed after the real work.” **After:**
  “If the team counts generated patches as finished work, review and support
  start to look like delays. They are still part of the job.”
- **Before:** “A team does not need a complicated queueing model to notice this
  pattern.” **After:** “Start with the open pull requests and how long each has
  waited. Find the person or decision each one is waiting for.”
- **Before:** “This is an illustrative description, not a completed review from
  a real team.” **Edit:** Cut the repeated label. Continue directly with the
  reviewer being able to question the import policy before reading the helper.

**Preserve:** smaller PRs should keep a complete behavior together. An agent's
second look does not transfer responsibility for accepting the change.

## 9. The Agent Learned to Ignore the Check

File: `data/blog/the-agent-learned-to-ignore-the-check.mdx`

Clarify “learned” once, then stay with the note and the current failure.

- **Before:** “‘Learned’ in the title means the agent followed examples and
  instructions present in its task context.” **After:** “Here, the agent is
  following the repository's notes and examples; the failed run has not
  retrained the model.”
- **Before:** “A transferable exemption from it.” **After:** “The error may look
  familiar. That is a reason to compare the failures, not permission to ignore
  this one.”
- **Before:** “The agent then carried that pattern into a new situation faster
  and more confidently than a tired reviewer might have done.” **After:** “Each
  exception seemed reasonable at the time. Together they made bypassing the
  check look normal, and the agent copied that habit.” The human speed comparison
  adds an unnecessary claim.
- **Before:** “A bounded exception may be reasonable.” **After:** “A temporary
  exception can be reasonable. Name the check, record what is no longer covered,
  assign an owner, and say what will end the exception.”

**Preserve:** a step's failure `outcome` can differ from its later `conclusion`.
Do not imply `continue-on-error` guarantees all later jobs or merges succeed.

## 10. The Scheduler Ran. The Article Never Appeared.

File: `data/blog/the-scheduler-worked-and-the-article-never-appeared.mdx`

The pending ending is stale. The verification note supplies a real resolution.

- **Before:** “The repair was still awaiting complete live verification when
  this draft was written. That limit belongs in the story.” **Edit:** Remove
  drafting narration. The dated incident and linked log establish that it is real.
- **Before:** “A discrepancy between intended publication and the live site's
  advertised pages.” **After:** “The scheduler found missing pages and asked for
  a deployment.” Keep the number and source link.
- **Before:** “Identifying the failing operation is stronger evidence than
  guessing at the largest directory.” **After:** “The server ran out of space
  while unpacking the image. The filename shows where the pull failed; it does
  not show what filled the disk.”
- **Before:** “The proposed repair” and “a multiply tagged image.” **After:**
  “The repair” and “an image with several tags.” Keep tag removal distinct from
  freeing stored image data.
- **Before:** “This draft therefore ends with a question to resolve before
  publication.” **Edit:** Replace the whole last paragraph with the observed
  ending below. These are drafting instructions, not part of the incident.

### Suggested ending from the existing verification note

The first release attempt caught one more problem: the new test used Bash, but
the Alpine build image did not have it. We changed the test to use `sh` and ran
CI again before releasing.

The [repaired release](https://github.com/mehdiakiki/mehdi-cz/actions/runs/40096218062)
succeeded on October 24. The log shows old site tags and image layers removed
before the pull, then the blog container becoming healthy at 13:06:05 UTC.
The [check-only run](https://github.com/mehdiakiki/mehdi-cz/actions/runs/40096755012)
reported no missing due articles and no overdue work. Its build and deployment
steps were skipped. A separate fetch of the
[original prompting article](https://www.mehdi.cz/blog/prompt-for-one-verifiable-change)
returned HTTP 200 with the expected title, heading, and opening paragraph.

The new image reached the server, the current due articles appeared in the
sitemap, and the prompting article could be read. Future scheduled runs still
depend on GitHub running the workflow and the deployment succeeding.

Keep the existing GitHub scheduling-delay citation, but explain that timing
limit only once. The release and HTTP response make a stronger ending than
another general lesson about evidence.

**Preserve:** the probe verified sitemap entries; only the prompting article is
recorded as directly fetched. The final prune's `0B` is not total reclaimed
storage. Future cron timing is uncertain. The ten held drafts were not released.

## Companion index

After editing article 10, update `ci-agent-series.md`: it still says the story
ends with verification pending. Retain its draft holds and the statement that
technical and publication validation of the ten articles remains paused.

Keep code semantics, citations, dates, source boundaries, and metadata locks.
Do not invent personal experience, measured productivity improvements, or real
agent outcomes for the nine fictional stories. A second language pass should
check the rewritten endings together, not just each sentence in isolation.

## Second language pass: revised drafts

I read all ten revised articles in full. The revision addresses the main
language problems: concrete actions replace policy language, fiction is labeled
once per article, repeated defenses against unmade claims are gone, and the
endings no longer follow the same lesson-summary template. The summaries are
also clearer. Articles 3–5 and 8 need no further language rewrite.

**One meaning change should be fixed:**

- **Article 1, line 71:** “It will keep the agent from adding more work to the
  same patch while the result is pending.” A prompt does not guarantee the
  agent follows its limit. Suggested: “It tells the agent to leave the patch
  alone while CI is pending.” The earlier wording used “can”; simplification
  should not turn that into certainty.

**Three small wording edits are worth considering:**

- **Article 2, line 12:** “A cleaned-up email address” is less precise than
  the earlier “normalized email.” Suggested: “The agent builds a map using
  each email address as the key, ignoring letter case and surrounding spaces.”
  This explains the matching rule without suggesting other address changes.
- **Article 9, line 22:** “Those are different amounts of knowledge” remains
  awkward English. Suggested: “A tracked bug gives you more to work with than
  a remembered error message.”
- **Article 7, line 12:** “Three applications” is unnecessary specificity when
  the later diagram names two. “CI starts every application's browser tests”
  keeps the point without making readers look for the third application.

The important qualifications have survived the simpler wording: early tests do
not replace required checks; keeping the latest contact can be a valid product
choice; a warning count does not establish row identity; a PR head can differ
from the tested merge commit; a cache-busting ID is not a publication clock;
and allowing a step to fail changes what the job enforces. Article 4 still
explains that protecting an active deployment does not queue every pending run.

Article 10 now follows the real failure through the shell portability problem,
successful release, sitemap probe, and separate page fetch. It distinguishes
those results and avoids claiming guaranteed future delivery. The stale
pending-repair narration is gone. No further language change is needed there.

**Verdict:** keep this direction. After the certainty correction in article 1,
another broad rewrite would have little benefit. This is a language judgment,
not publication approval or a technical validation pass. No article edits,
executable checks, releases, or metadata changes were made during this pass.

## Edits applied after the second pass

The editor applied the certainty correction and all three small wording edits:

- Article 1 now says the prompt tells the agent to leave the patch alone while CI is pending.
- Article 2 names letter case and surrounding spaces as the matching rule.
- Article 7 now refers to every application's browser tests, matching the example without introducing a third application.
- Article 9 replaces “different amounts of knowledge” with the comparison between a tracked bug and a remembered error message.

A source comparison found no changes to the original fenced examples and no
removed source links across the ten drafts. All ten retain `draft: true` and
`reviewed: false`. This completes the language edit; technical validation and
publication remain on hold.
