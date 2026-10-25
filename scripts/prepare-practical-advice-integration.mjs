// Generate integration checks from the article code, only in GitHub CI.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const manifest = JSON.parse(
  await readFile("docs/editorial/practical-advice-50-drafts-2026-10-25.json", "utf8")
);
async function snippet(number, index = 0) {
  const article = manifest.articles.find((article) => article.number === number);
  const source = await readFile(article.path, "utf8");
  const code = [...source.matchAll(/^```rust\n([\s\S]*?)^```/gm)][index]?.[1];
  assert.ok(code, `Missing Rust block ${index}: ${article.slug}`);
  return code;
}

let crate;
let evidence;
let code;
if (process.argv[2] === "postgres") {
  crate = "experiments/sql-rust/postgres-sqlite";
  evidence = "/tmp/sql-rust-postgres-sqlite";
  code = `#![allow(dead_code)]
mod request_ownership {
${await snippet(13)}

    #[tokio::test]
    async fn normal_completion_can_be_joined_without_moving_the_handle() {
        let mut owner = RequestTask(tokio::spawn(async { 42 }));
        assert_eq!(owner.join().await.unwrap(), 42);
    }

    #[tokio::test]
    async fn worker_panic_is_visible_to_the_owner() {
        let handle: tokio::task::JoinHandle<()> = tokio::spawn(async { panic!("controlled failure") });
        let mut owner = RequestTask(handle);
        assert!(owner.join().await.unwrap_err().is_panic());
    }

    struct NotifyDrop(Option<tokio::sync::oneshot::Sender<()>>);
    impl Drop for NotifyDrop {
        fn drop(&mut self) {
            if let Some(sender) = self.0.take() { let _ = sender.send(()); }
        }
    }

    #[tokio::test]
    async fn dropping_the_owner_requests_cancellation() {
        let (started_tx, started_rx) = tokio::sync::oneshot::channel();
        let (dropped_tx, dropped_rx) = tokio::sync::oneshot::channel();
        let handle = tokio::spawn(async move {
            let _notify = NotifyDrop(Some(dropped_tx));
            started_tx.send(()).unwrap();
            std::future::pending::<()>().await;
        });
        let owner = RequestTask(handle);
        started_rx.await.unwrap();
        drop(owner);
        tokio::time::timeout(std::time::Duration::from_secs(2), dropped_rx)
            .await.unwrap().unwrap();
    }
}

mod worker_reply {
${await snippet(18)}

    #[tokio::test]
    async fn successful_empty_and_nonempty_results_remain_successes() {
        for bytes in [vec![], vec![1, 2]] {
            let (tx, rx) = tokio::sync::oneshot::channel();
            assert!(tx.send(Ok(bytes.clone())).is_ok());
            assert!(matches!(receive_reply(rx).await, Ok(value) if value == bytes));
        }
    }

    #[tokio::test]
    async fn business_error_is_not_a_closed_reply() {
        let (tx, rx) = tokio::sync::oneshot::channel();
        assert!(tx.send(Err(JobError::InvalidInput)).is_ok());
        assert!(matches!(receive_reply(rx).await, Err(RequestError::Job(JobError::InvalidInput))));
    }

    #[tokio::test]
    async fn dropped_sender_is_not_an_empty_success() {
        let (tx, rx) = tokio::sync::oneshot::channel();
        drop(tx);
        assert!(matches!(receive_reply(rx).await, Err(RequestError::WorkerGone)));
    }

    #[tokio::test]
    async fn worker_panic_closes_the_reply_and_can_be_observed() {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let worker: tokio::task::JoinHandle<()> = tokio::spawn(async move {
            let _reply = tx;
            panic!("controlled worker failure");
        });
        assert!(worker.await.unwrap_err().is_panic());
        assert!(matches!(receive_reply(rx).await, Err(RequestError::WorkerGone)));
    }
}

#[cfg(feature = "postgres-integration")]
mod webhook_receipt {
    async fn persist(
        pool: &sqlx::PgPool,
        tenant_id: &str,
        provider: &str,
        event_id: &str,
        payload_hash: &str,
        payload: &[u8],
    ) -> Result<(), sqlx::Error> {
        let mut tx = pool.begin().await?;
        sqlx::query("SET LOCAL search_path = practical_advice_receipt_review")
            .execute(&mut *tx).await?;
${await snippet(39)}
        Ok(())
    }

    #[tokio::test]
    async fn committed_receipt_contains_recoverable_bytes_after_reconnect()
        -> Result<(), Box<dyn std::error::Error>>
    {
        let url = std::env::var("SQL_RUST_PG_URL")?;
        let pool = sqlx::PgPool::connect(&url).await?;
        sqlx::query("CREATE SCHEMA practical_advice_receipt_review").execute(&pool).await?;
        sqlx::query("CREATE TABLE practical_advice_receipt_review.webhook_receipts (
            tenant_id text NOT NULL, provider text NOT NULL, event_id text NOT NULL,
            payload_hash text NOT NULL, payload bytea NOT NULL, state text NOT NULL,
            PRIMARY KEY (tenant_id, provider, event_id)
        )").execute(&pool).await?;
        let payload: &[u8] = b"verified event fixture";
        persist(&pool, "a", "fixture", "event-42", "synthetic-match-only", payload).await?;
        pool.close().await;

        let reopened = sqlx::PgPool::connect(&url).await?;
        let stored: (Vec<u8>, String) = sqlx::query_as(
            "SELECT payload, state FROM practical_advice_receipt_review.webhook_receipts
             WHERE tenant_id = $1 AND provider = $2 AND event_id = $3"
        ).bind("a").bind("fixture").bind("event-42").fetch_one(&reopened).await?;
        assert_eq!(stored.0, payload);
        assert_eq!(stored.1, "pending");
        persist(&reopened, "a", "fixture", "event-42", "synthetic-match-only", payload).await?;
        let count: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM practical_advice_receipt_review.webhook_receipts"
        ).fetch_one(&reopened).await?;
        assert_eq!(count, 1);
        sqlx::query("DROP SCHEMA practical_advice_receipt_review CASCADE")
            .execute(&reopened).await?;
        reopened.close().await;
        Ok(())
    }
}
`;
} else if (process.argv[2] === "enterprise") {
  crate = "experiments/sql-rust/sqlserver-oracle-db2";
  evidence = "/tmp/sql-rust-enterprise";
  code = `#![allow(dead_code)]
#[cfg(feature = "sqlserver")]
mod reporting_permission {
${await snippet(9)}

    async fn compile_the_update_probe(client: &mut sql_rust_enterprise_examples::SqlClient) {
${await snippet(9, 1)}
    }

    #[test]
    #[should_panic]
    fn a_transport_failure_must_not_pass_the_permission_assertion() {
        let error: tiberius::error::Error = std::io::Error::new(
            std::io::ErrorKind::ConnectionReset, "synthetic transport failure"
        ).into();
        assert_update_permission_denied(&error);
    }
}
`;
} else {
  throw new Error("Expected postgres or enterprise");
}

const target = path.join(crate, "tests/practical_advice.rs");
await mkdir(path.dirname(target), { recursive: true });
await mkdir(evidence, { recursive: true });
await writeFile(target, code);
await writeFile(path.join(evidence, "practical-advice.rs"), code);
console.log(`Prepared article-derived checks: ${target}`);
