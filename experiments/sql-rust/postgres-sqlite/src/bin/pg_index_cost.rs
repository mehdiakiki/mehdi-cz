use sql_rust_postgres_sqlite::{pg::Fixture, Result};
use std::time::Instant;

async fn sample(indexed: bool, sample: usize) -> Result<()> {
    let fixture = Fixture::new().await?;
    let outcome = async {
        sqlx::raw_sql(
            "CREATE TABLE jobs_index_trial (id integer PRIMARY KEY, status integer NOT NULL, payload text NOT NULL) WITH (fillfactor=70);
             INSERT INTO jobs_index_trial SELECT g, g % 100, repeat('x', 100) FROM generate_series(1,10000) g;",
        ).execute(&fixture.pool).await?;
        if indexed {
            sqlx::query("CREATE INDEX jobs_status ON jobs_index_trial(status)").execute(&fixture.pool).await?;
        }
        sqlx::query("VACUUM ANALYZE jobs_index_trial").execute(&fixture.pool).await?;
        let plan: Vec<String> = sqlx::query_scalar(
            "EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM jobs_index_trial WHERE status = 3",
        ).fetch_all(&fixture.pool).await?;
        let before_size: i64 = sqlx::query_scalar("SELECT pg_indexes_size('jobs_index_trial')")
            .fetch_one(&fixture.pool).await?;
        let mut tx = fixture.pool.begin().await?;
        let start = Instant::now();
        let changed = sqlx::query("UPDATE jobs_index_trial SET status = (status + 1) % 100 WHERE id <= 1000")
            .execute(&mut *tx).await?.rows_affected();
        let statement_us = start.elapsed().as_micros();
        let counts: (i64, i64) = sqlx::query_as(
            "SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_xact_user_tables WHERE relid = 'jobs_index_trial'::regclass",
        ).fetch_one(&mut *tx).await?;
        let commit_start = Instant::now();
        tx.commit().await?;
        let commit_us = commit_start.elapsed().as_micros();
        assert_eq!(changed, 1000);
        assert_eq!(counts.0, 1000);
        if indexed { assert_eq!(counts.1, 0); }
        let stored: i64 = sqlx::query_scalar("SELECT count(*) FROM jobs_index_trial WHERE id <= 1000 AND status = (id + 1) % 100")
            .fetch_one(&fixture.pool).await?;
        assert_eq!(stored, 1000);
        println!("INDEX_SAMPLE,sample={sample},indexed={indexed},rows={changed},statement_us={statement_us},commit_us={commit_us},index_bytes={before_size},hot={}", counts.1);
        println!("PLAN indexed={indexed} sample={sample}\n{}",plan.join("\n"));
        Ok(())
    }.await;
    fixture.finish(outcome).await
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    for (number, indexed) in [false, true, true, false, false, true]
        .into_iter()
        .enumerate()
    {
        sample(indexed, number + 1).await?;
    }
    Ok(())
}
