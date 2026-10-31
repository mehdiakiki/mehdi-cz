use rust_backend_labs::{database, discard};
use sqlx::PgPool;

// Fixed trusted fixture identities stand in for an authenticated application context.
// Neither identity nor model selection comes from a model-generated tool argument.
struct Tenant(i64);

#[derive(Debug, PartialEq, Eq)]
struct Passage {
    document_id: i64,
    revision: i64,
    body: String,
}

async fn fixture(schema: &'static str) -> PgPool {
    let pool = database(schema).await;
    let mut extension_setup = pool.begin().await.unwrap();
    sqlx::query("SELECT pg_advisory_xact_lock(881031)")
        .execute(&mut *extension_setup)
        .await
        .unwrap();
    sqlx::query("CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public")
        .execute(&mut *extension_setup)
        .await
        .unwrap();
    extension_setup.commit().await.unwrap();
    sqlx::query(
        "CREATE TABLE rag_documents (tenant_id bigint, id bigint, revision bigint NOT NULL, \
         body text NOT NULL CHECK (octet_length(body) <= 4096), \
         deleted boolean NOT NULL DEFAULT false, PRIMARY KEY (tenant_id, id))",
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        "CREATE TABLE rag_embeddings (tenant_id bigint, document_id bigint, source_revision bigint, \
         model text, embedding public.vector(3) NOT NULL, \
         PRIMARY KEY (tenant_id, document_id, source_revision, model), \
         FOREIGN KEY (tenant_id, document_id) REFERENCES rag_documents(tenant_id, id))",
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO rag_documents (tenant_id, id, revision, body, deleted) VALUES \
         (7, 101, 1, 'Resume an interrupted upload using its session.', false), \
         (7, 102, 2, 'Updated instructions without a current embedding.', false), \
         (8, 201, 1, 'PRIVATE_TENANT_8_MARKER', false), \
         (7, 103, 1, 'DELETED_DOCUMENT_MARKER', true), \
         (7, 104, 1, 'OTHER_EMBEDDING_MODEL_MARKER', false)",
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO rag_embeddings VALUES \
         (7, 101, 1, 'fixture-v1', '[0.8,0.2,0]'), \
         (7, 102, 1, 'fixture-v1', '[1,0,0]'), \
         (8, 201, 1, 'fixture-v1', '[1,0,0]'), \
         (7, 103, 1, 'fixture-v1', '[1,0,0]'), \
         (7, 104, 1, 'fixture-v2', '[1,0,0]')",
    )
    .execute(&pool)
    .await
    .unwrap();
    pool
}

async fn retrieve(
    pool: &PgPool,
    tenant: &Tenant,
    model: &str,
    query_vector: &str,
) -> Result<Vec<Passage>, sqlx::Error> {
    // article:retrieval-query:start
    let rows: Vec<(i64, i64, String)> = sqlx::query_as(
        "SELECT d.id, d.revision, d.body \
         FROM rag_documents d \
         JOIN rag_embeddings e \
           ON e.tenant_id = d.tenant_id AND e.document_id = d.id \
         WHERE d.tenant_id = $1 AND NOT d.deleted \
           AND e.source_revision = d.revision AND e.model = $2 \
         ORDER BY e.embedding OPERATOR(public.<=>) $3::public.vector, d.id \
         LIMIT 3",
    )
    .bind(tenant.0)
    .bind(model)
    .bind(query_vector)
    .fetch_all(pool)
    .await?;
    // article:retrieval-query:end
    Ok(rows
        .into_iter()
        .map(|(document_id, revision, body)| Passage {
            document_id,
            revision,
            body,
        })
        .collect())
}

async fn publish_embedding(
    pool: &PgPool,
    tenant: &Tenant,
    document_id: i64,
    expected_revision: i64,
    model: &str,
    embedding: &str,
) -> Result<u64, sqlx::Error> {
    // article:embedding-publication:start
    let changed = sqlx::query(
        "INSERT INTO rag_embeddings \
           (tenant_id, document_id, source_revision, model, embedding) \
         SELECT tenant_id, id, revision, $4, $5::public.vector \
         FROM rag_documents \
         WHERE tenant_id = $1 AND id = $2 AND revision = $3 AND NOT deleted \
         ON CONFLICT (tenant_id, document_id, source_revision, model) \
         DO UPDATE SET embedding = EXCLUDED.embedding",
    )
    .bind(tenant.0)
    .bind(document_id)
    .bind(expected_revision)
    .bind(model)
    .bind(embedding)
    .execute(pool)
    .await?
    .rows_affected();
    // article:embedding-publication:end
    Ok(changed)
}

fn model_context(passages: &[Passage], max_bytes: usize) -> Result<String, &'static str> {
    let mut context = String::new();
    for passage in passages {
        let header = format!(
            "[document={} revision={}]\n",
            passage.document_id, passage.revision
        );
        let required = context
            .len()
            .checked_add(header.len())
            .and_then(|length| length.checked_add(passage.body.len()))
            .and_then(|length| length.checked_add(2))
            .ok_or("context size overflow")?;
        if required > max_bytes {
            return Err("context byte budget exceeded");
        }
        context.push_str(&header);
        context.push_str(&passage.body);
        context.push_str("\n\n");
    }
    Ok(context)
}

#[tokio::test]
async fn inspect_model_context_instead_of_only_the_final_answer() {
    let pool = fixture("backend_rag_context").await;
    let naive: Vec<i64> = sqlx::query_scalar(
        "SELECT d.id FROM rag_documents d JOIN rag_embeddings e \
         ON e.tenant_id = d.tenant_id AND e.document_id = d.id \
         WHERE NOT d.deleted AND e.model = 'fixture-v1' \
         ORDER BY e.embedding OPERATOR(public.<=>) '[1,0,0]'::public.vector, d.id LIMIT 3",
    )
    .fetch_all(&pool)
    .await
    .unwrap();
    assert!(naive.contains(&201), "baseline leaks another tenant");
    assert!(naive.contains(&102), "baseline accepts a stale embedding");

    let passages = retrieve(&pool, &Tenant(7), "fixture-v1", "[1,0,0]")
        .await
        .unwrap();
    assert_eq!(
        passages,
        vec![Passage {
            document_id: 101,
            revision: 1,
            body: "Resume an interrupted upload using its session.".into(),
        }]
    );
    let context = model_context(&passages, 4096).unwrap();
    assert!(context.contains("document=101 revision=1"));
    assert!(!context.contains("PRIVATE_TENANT_8_MARKER"));
    assert!(!context.contains("DELETED_DOCUMENT_MARKER"));
    assert!(!context.contains("OTHER_EMBEDDING_MODEL_MARKER"));
    assert!(!context.contains("Updated instructions"));

    // A nonempty positive case for each tenant prevents an always-empty repair.
    let other = retrieve(&pool, &Tenant(8), "fixture-v1", "[1,0,0]")
        .await
        .unwrap();
    assert_eq!(other.len(), 1);
    assert_eq!(other[0].document_id, 201);
    println!("naive IDs={naive:?}; tenant 7 context=[101@1]; tenant 8 context=[201@1]");
    discard(pool, "backend_rag_context").await;
}

#[tokio::test]
async fn edits_and_deletion_make_late_embedding_work_ineligible() {
    let pool = fixture("backend_rag_lifecycle").await;
    let tenant = Tenant(7);
    // The revision-1 embedding job is still running when this edit commits.
    sqlx::query(
        "UPDATE rag_documents SET revision = revision + 1, body = $1 \
         WHERE tenant_id = 7 AND id = 101",
    )
    .bind("Revision two: ask for a new upload session.")
    .execute(&pool)
    .await
    .unwrap();
    assert_eq!(
        publish_embedding(&pool, &tenant, 101, 1, "fixture-v1", "[1,0,0]")
            .await
            .unwrap(),
        0
    );
    assert!(retrieve(&pool, &tenant, "fixture-v1", "[1,0,0]")
        .await
        .unwrap()
        .is_empty());
    assert_eq!(
        publish_embedding(&pool, &tenant, 101, 2, "fixture-v1", "[1,0,0]")
            .await
            .unwrap(),
        1
    );
    let fresh = retrieve(&pool, &tenant, "fixture-v1", "[1,0,0]")
        .await
        .unwrap();
    assert_eq!(fresh.len(), 1);
    assert_eq!(fresh[0].revision, 2);
    assert_eq!(fresh[0].body, "Revision two: ask for a new upload session.");

    sqlx::query(
        "UPDATE rag_documents SET deleted = true, revision = revision + 1 \
         WHERE tenant_id = 7 AND id = 101",
    )
    .execute(&pool)
    .await
    .unwrap();
    assert_eq!(
        publish_embedding(&pool, &tenant, 101, 2, "fixture-v1", "[1,0,0]")
            .await
            .unwrap(),
        0
    );
    let deleted = retrieve(&pool, &tenant, "fixture-v1", "[1,0,0]")
        .await
        .unwrap();
    assert!(deleted.is_empty());
    assert!(model_context(&deleted, 4096).unwrap().is_empty());
    println!("edit: old job affected=0, context empty; current job affected=1; deletion: late job affected=0, context empty");
    discard(pool, "backend_rag_lifecycle").await;
}

#[test]
fn model_context_budget_counts_utf8_bytes_and_headers() {
    let passages = vec![Passage {
        document_id: 101,
        revision: 1,
        body: "é".into(),
    }];
    let expected = "[document=101 revision=1]\né\n\n";
    assert_eq!(model_context(&passages, expected.len()).unwrap(), expected);
    assert!(model_context(&passages, expected.len() - 1).is_err());
    assert_eq!(model_context(&[], 0).unwrap(), "");
}
