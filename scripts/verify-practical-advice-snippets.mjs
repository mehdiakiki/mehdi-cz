// Compile exact self-contained article snippets and exercise their boundaries in GitHub CI.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Run compiler workloads in GitHub CI");
const manifest = JSON.parse(
  await readFile("docs/editorial/practical-advice-50-drafts-2026-10-25.json", "utf8")
);
const output = "/tmp/editorial-evidence/practical-advice-snippets";
await mkdir(output, { recursive: true });
const cases = [
  {
    number: 14,
    tests: `
#[test] fn bounded_inputs() {
    assert_eq!(read_bounded(&b"abc"[..], 3).unwrap(), b"abc");
    assert_eq!(read_bounded(&b"ab"[..], 3).unwrap(), b"ab");
    assert!(read_bounded(&b"abcd"[..], 3).is_err());
    assert!(read_bounded(&b"a"[..], 0).is_err());
    assert!(read_bounded(&b""[..], 0).unwrap().is_empty());
    assert!(read_bounded(&b""[..], usize::MAX).is_err());
}
#[test] fn source_error_is_preserved() {
    struct Broken;
    impl Read for Broken {
        fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
            Err(io::Error::new(io::ErrorKind::PermissionDenied, "probe"))
        }
    }
    assert_eq!(read_bounded(Broken, 3).unwrap_err().kind(), io::ErrorKind::PermissionDenied);
}`,
  },
  { number: 16, statement: true },
  { number: 20, statement: true },
  {
    number: 17,
    tests: `
#[test] fn exactly_one_concurrent_reservation() {
    let remaining = std::sync::Arc::new(AtomicUsize::new(1));
    let barrier = std::sync::Arc::new(std::sync::Barrier::new(8));
    let handles: Vec<_> = (0..8).map(|_| {
        let remaining = remaining.clone(); let barrier = barrier.clone();
        std::thread::spawn(move || { barrier.wait(); reserve_one(&remaining) })
    }).collect();
    let successes = handles.into_iter().map(|h| usize::from(h.join().unwrap())).sum::<usize>();
    assert_eq!(successes, 1);
    assert_eq!(remaining.load(Ordering::Relaxed), 0);
    assert!(!reserve_one(&remaining));
}`,
  },
  {
    number: 19,
    tests: `
#[test] fn byte_boundary_and_overflow() {
    assert!(fits_budget(7, 3, 10));
    assert!(!fits_budget(7, 4, 10));
    assert!(!fits_budget(usize::MAX, 1, usize::MAX));
}`,
  },
  {
    number: 31,
    tests: `
#[test] fn unknown_status_never_becomes_usable() {
    assert_eq!(map_status("active"), Availability::Usable);
    assert_eq!(map_status("suspended"), Availability::Blocked);
    assert_eq!(map_status("closed"), Availability::Blocked);
    assert_eq!(map_status("new_provider_state"), Availability::Unknown);
    assert_eq!(map_status(""), Availability::Unknown);
}`,
  },
  {
    number: 33,
    tests: `
#[test] fn attempts_and_deadline_both_apply() {
    let now = std::time::Instant::now();
    let deadline = now + std::time::Duration::from_secs(10);
    let mut budget = AttemptBudget { remaining: 2, deadline };
    assert!(budget.claim(now)); assert!(budget.claim(now)); assert!(!budget.claim(now));
    let mut expired = AttemptBudget { remaining: 2, deadline };
    assert!(!expired.claim(deadline)); assert_eq!(expired.remaining, 2);
}`,
  },
  {
    number: 37,
    tests: `
#[test] fn colliding_external_ids_stay_separate() {
    let a = CacheKey { tenant_id: "a".into(), provider_account_id: "same".into(), external_record_id: "42".into() };
    let b = CacheKey { tenant_id: "b".into(), ..a.clone() };
    let mut cache = std::collections::HashMap::new();
    cache.insert(a.clone(), "private-a"); cache.insert(b.clone(), "private-b");
    assert_eq!(cache.get(&a), Some(&"private-a"));
    assert_eq!(cache.get(&b), Some(&"private-b"));
    cache.remove(&a); assert_eq!(cache.get(&b), Some(&"private-b"));
}`,
  },
  {
    number: 44,
    tests: `
#[test] fn lookup_never_offers_write_tools() {
    assert_eq!(offered_tools(Workflow::SupportLookup), &["find_invoice", "read_invoice"]);
    assert_eq!(offered_tools(Workflow::RefundReview), &["read_invoice", "preview_refund"]);
    assert!(!offered_tools(Workflow::RefundReview).contains(&"execute_refund"));
}`,
  },
  {
    number: 47,
    tests: `
#[test] fn capture_preserves_intended_message() {
    let mut adapter = CapturedMail::default();
    adapter.send(Mail { recipient: "test@example.test".into(), subject: "fixture".into(), body: "synthetic".into() }).unwrap();
    assert_eq!(adapter.messages.len(), 1);
    assert_eq!(adapter.messages[0].recipient, "test@example.test");
    assert_eq!(adapter.messages[0].subject, "fixture");
    assert_eq!(adapter.messages[0].body, "synthetic");
}`,
  },
];
for (const fixture of cases) {
  const article = manifest.articles.find((article) => article.number === fixture.number);
  const source = await readFile(article.path, "utf8");
  const code = [...source.matchAll(/^```rust\n([\s\S]*?)^```/gm)][0]?.[1];
  assert.ok(code, article.slug);
  const rust =
    "#![allow(dead_code)]\n" +
    (fixture.statement ? `#[test] fn article_example() {\n${code}\n}` : code + fixture.tests);
  const file = `${output}/${fixture.number}.rs`;
  const binary = `${output}/${fixture.number}`;
  await writeFile(file, rust);
  execFileSync("rustc", ["--edition=2021", "--test", file, "-o", binary], {
    stdio: "inherit",
    timeout: 60000,
  });
  execFileSync(binary, ["--nocapture"], { stdio: "inherit", timeout: 30000 });
  console.log(`Verified exact Rust snippet: ${article.slug}`);
}
console.log(
  `Verified ${cases.length} self-contained snippets. Application excerpts and engine scenarios are separate review work.`
);
