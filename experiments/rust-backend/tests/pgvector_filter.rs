use rust_backend_labs::{database, discard};
use sqlx::PgConnection;

// article:filtered-vector-definition:start
const FILTERED: &str =
    "SELECT id FROM filtered_documents WHERE tenant_id = $1 \
     ORDER BY embedding OPERATOR(public.<=>) $2::public.vector LIMIT 5";
// article:filtered-vector-definition:end

async fn filtered(connection: &mut PgConnection) -> Result<Vec<i64>, sqlx::Error> {
    // article:filtered-vector-query:start
    let ids: Vec<i64> = sqlx::query_scalar(FILTERED)
        .bind(7_i64)
        .bind("[1,0,0]")
        .fetch_all(connection)
        .await?;
    // article:filtered-vector-query:end
    Ok(ids)
}

async fn plan(connection: &mut PgConnection) -> Result<String, sqlx::Error> {
    let lines: Vec<String> = sqlx::query_scalar(&format!("EXPLAIN (COSTS OFF) {FILTERED}"))
        .bind(7_i64)
        .bind("[1,0,0]")
        .fetch_all(connection)
        .await?;
    Ok(lines.join("\n"))
}

#[tokio::test]
async fn keep_the_tenant_filter_while_increasing_the_hnsw_search_work() -> Result<(), sqlx::Error> {
    let pool = database("backend_pgvector_filter").await;
    let mut tx = pool.begin().await.unwrap();
    sqlx::query("SELECT pg_advisory_xact_lock(881031)")
        .execute(&mut *tx)
        .await
        .unwrap();
    sqlx::query("CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public")
        .execute(&mut *tx)
        .await
        .unwrap();
    let version: String = sqlx::query_scalar("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
        .fetch_one(&mut *tx)
        .await
        .unwrap();
    assert_eq!(version, "0.8.7");
    sqlx::query(
        "CREATE TABLE filtered_documents \
         (id bigint PRIMARY KEY, tenant_id bigint NOT NULL, embedding public.vector(3) NOT NULL)",
    )
    .execute(&mut *tx)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO filtered_documents \
         SELECT n, 8, ('[1,' || n::double precision / 1000000 || ',0.001]')::public.vector \
         FROM generate_series(1, 1000) n",
    )
    .execute(&mut *tx)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO filtered_documents \
         SELECT 1000 + n, 7, ('[0.02,1,' || n::double precision / 1000 || ']')::public.vector \
         FROM generate_series(1, 10) n",
    )
    .execute(&mut *tx)
    .await
    .unwrap();
    sqlx::query("CREATE INDEX filtered_hnsw ON filtered_documents USING hnsw (embedding public.vector_cosine_ops)")
        .execute(&mut *tx)
        .await
        .unwrap();
    sqlx::query("ANALYZE filtered_documents")
        .execute(&mut *tx)
        .await
        .unwrap();

    // Hold data constant and inspect each actual plan; these are diagnostic settings.
    sqlx::query("SET LOCAL enable_indexscan = off")
        .execute(&mut *tx)
        .await
        .unwrap();
    let exact_plan = plan(&mut tx).await.unwrap();
    assert!(exact_plan.contains("Seq Scan"), "{exact_plan}");
    let exact = filtered(&mut tx).await.unwrap();
    assert_eq!(exact.len(), 5);

    sqlx::query("SET LOCAL enable_indexscan = on")
        .execute(&mut *tx)
        .await
        .unwrap();
    sqlx::query("SET LOCAL enable_seqscan = off")
        .execute(&mut *tx)
        .await
        .unwrap();
    sqlx::query("SET LOCAL hnsw.ef_search = 40")
        .execute(&mut *tx)
        .await
        .unwrap();
    sqlx::query("SET LOCAL hnsw.iterative_scan = 'off'")
        .execute(&mut *tx)
        .await
        .unwrap();
    let approximate_plan = plan(&mut tx).await.unwrap();
    assert!(approximate_plan.contains("Index Scan using filtered_hnsw"), "{approximate_plan}");
    let limited = filtered(&mut tx).await.unwrap();
    assert!(limited.len() < 5, "fixture must expose missing authorized results: {limited:?}");

    // article:iterative-vector-scan:start
    sqlx::query("SET LOCAL hnsw.iterative_scan = 'strict_order'")
        .execute(&mut *tx)
        .await?;
    // article:iterative-vector-scan:end
    let expanded_plan = plan(&mut tx).await.unwrap();
    assert!(expanded_plan.contains("Index Scan using filtered_hnsw"), "{expanded_plan}");
    let expanded = filtered(&mut tx).await.unwrap();
    assert_eq!(expanded.len(), 5);
    assert!(expanded.iter().all(|id| (1001..=1010).contains(id)));
    println!("PGVECTOR {version}: exact={} IDs={exact:?}; HNSW off={} IDs={limited:?}; iterative={} IDs={expanded:?}\nexact plan:\n{exact_plan}\nHNSW plan:\n{approximate_plan}\niterative plan:\n{expanded_plan}", exact.len(), limited.len(), expanded.len());
    tx.rollback().await.unwrap();
    discard(pool, "backend_pgvector_filter").await;
    Ok(())
}
