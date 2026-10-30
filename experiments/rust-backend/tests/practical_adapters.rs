use axum::{
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, Request, StatusCode},
    routing::get,
    Json, Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use hmac::{Hmac, Mac};
use http_body_util::BodyExt;
use rust_backend_labs::{database, discard};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::{Duration, SystemTime},
};
use tokio::sync::Mutex;
use tower::ServiceExt;

#[derive(Debug, PartialEq, Eq)]
enum Availability {
    Usable,
    Blocked,
    Unknown,
}
fn map_status(provider_status: &str) -> Availability {
    match provider_status {
        "active" => Availability::Usable,
        "suspended" | "closed" => Availability::Blocked,
        _ => Availability::Unknown,
    }
}
fn view(status: Option<&str>) -> serde_json::Value {
    match status.map(map_status).unwrap_or(Availability::Unknown) {
        Availability::Usable => serde_json::json!({"label":"Available","can_start":true}),
        Availability::Blocked => serde_json::json!({"label":"Unavailable","can_start":false}),
        Availability::Unknown => {
            serde_json::json!({"label":"Provider state needs review","can_start":false})
        }
    }
}
#[test]
fn unknown_provider_values_have_a_product_outcome_and_an_explicit_compatibility_update() {
    let received: serde_json::Value =
        serde_json::from_str(r#"{"status":"new_provider_state"}"#).unwrap();
    assert_eq!(view(received["status"].as_str())["can_start"], false);
    assert_eq!(view(None)["label"], "Provider state needs review");
    assert_eq!(view(Some("active"))["can_start"], true);
    assert_eq!(view(Some("closed"))["can_start"], false);
    let upgraded = |raw: &str| {
        if raw == "new_provider_state" {
            Availability::Blocked
        } else {
            map_status(raw)
        }
    };
    assert_eq!(upgraded("new_provider_state"), Availability::Blocked);
    assert_eq!(upgraded("active"), Availability::Usable);
    println!("PROVIDER_STATUS: new/missing states disable action with review label; explicit adapter update maps new state to blocked while active stays usable");
}

fn retry_after(value: Option<&str>, now: SystemTime, max_seconds: u64) -> Option<u64> {
    let text = value?;
    if text.len() > 128 {
        return None;
    }
    let text = text.trim();
    let seconds = if !text.is_empty() && text.bytes().all(|byte| byte.is_ascii_digit()) {
        text.parse::<u64>().ok()?
    } else {
        httpdate::parse_http_date(text)
            .ok()?
            .duration_since(now)
            .unwrap_or(Duration::ZERO)
            .as_secs()
    };
    (seconds <= max_seconds).then_some(seconds)
}
#[derive(Clone, Copy)]
enum LimitScope {
    Customer,
    Shared,
    Unknown,
}
fn public_limit(
    scope: LimitScope,
    retry: Option<&str>,
    now: SystemTime,
) -> (u16, serde_json::Value) {
    let wait = retry_after(retry, now, 60);
    match scope {
        LimitScope::Customer => (
            429,
            serde_json::json!({"code":"customer_quota","retry_after_seconds":wait}),
        ),
        LimitScope::Shared => (
            503,
            serde_json::json!({"code":"provider_capacity","retry_after_seconds":wait}),
        ),
        LimitScope::Unknown => (
            503,
            serde_json::json!({"code":"upstream_unavailable","retry_after_seconds":null}),
        ),
    }
}
#[test]
fn rate_limit_fixtures_translate_scope_and_bounded_retry_guidance() {
    let now = SystemTime::UNIX_EPOCH + Duration::from_secs(1_700_000_000);
    let raw =
        serde_json::json!({"message":"private provider account credential-fixture","status":429});
    let customer = public_limit(LimitScope::Customer, Some("5"), now);
    assert_eq!(customer.0, 429);
    assert_eq!(customer.1["retry_after_seconds"], 5);
    let date = httpdate::fmt_http_date(now + Duration::from_secs(7));
    let shared = public_limit(LimitScope::Shared, Some(&date), now);
    assert_eq!(shared.0, 503);
    assert_eq!(shared.1["retry_after_seconds"], 7);
    for header in [
        None,
        Some("broken"),
        Some("999999999999999999999999999999"),
        Some("61"),
    ] {
        assert_eq!(
            public_limit(LimitScope::Shared, header, now).1["retry_after_seconds"],
            serde_json::Value::Null
        );
    }
    let unknown = public_limit(LimitScope::Unknown, Some("5"), now);
    assert_eq!(unknown.1["code"], "upstream_unavailable");
    assert!(!serde_json::to_string(&[customer.1, shared.1, unknown.1])
        .unwrap()
        .contains(raw["message"].as_str().unwrap()));
    println!("RATE_LIMIT: configured customer scope=429; shared=503; unknown=503; seconds/date parsed; missing/malformed/over-limit guidance omitted; raw private message excluded");
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct CursorV1 {
    version: u8,
    tenant_id: String,
    query_identity: String,
    after_created_at_micros: i64,
    after_id: String,
    expires_at: u64,
}
fn sign_cursor(cursor: &CursorV1, key: &[u8]) -> String {
    let bytes = serde_json::to_vec(cursor).unwrap();
    let mut mac = Hmac::<Sha256>::new_from_slice(key).unwrap();
    mac.update(&bytes);
    format!(
        "{}.{}",
        URL_SAFE_NO_PAD.encode(&bytes),
        URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
    )
}
fn verify_cursor(
    token: &str,
    key: &[u8],
    tenant: &str,
    query: &str,
    now: u64,
) -> Result<CursorV1, &'static str> {
    if token.len() > 4096 {
        return Err("oversized cursor");
    }
    let (body, tag) = token.split_once('.').ok_or("invalid cursor")?;
    let bytes = URL_SAFE_NO_PAD.decode(body).map_err(|_| "invalid cursor")?;
    if bytes.len() > 1024 {
        return Err("oversized cursor");
    }
    let tag = URL_SAFE_NO_PAD.decode(tag).map_err(|_| "invalid cursor")?;
    let mut mac = Hmac::<Sha256>::new_from_slice(key).map_err(|_| "invalid key")?;
    mac.update(&bytes);
    mac.verify_slice(&tag).map_err(|_| "invalid integrity")?;
    let cursor: CursorV1 = serde_json::from_slice(&bytes).map_err(|_| "invalid cursor")?;
    if cursor.version != 1
        || cursor.tenant_id != tenant
        || cursor.query_identity != query
        || cursor.expires_at <= now
        || cursor.after_id.len() > 64
    {
        return Err("incompatible cursor");
    }
    Ok(cursor)
}
#[tokio::test]
async fn signed_cursor_rejects_other_queries_and_traverses_ties_after_boundary_deletion() {
    let key = b"fixture-only-key-for-cursor-tests";
    let mut cursor = CursorV1 {
        version: 1,
        tenant_id: "tenant-a".into(),
        query_identity: "state=open;created,id:asc".into(),
        after_created_at_micros: 10,
        after_id: "01".into(),
        expires_at: 100,
    };
    let token = sign_cursor(&cursor, key);
    let accepted = verify_cursor(&token, key, "tenant-a", &cursor.query_identity, 10).unwrap();
    for (tenant, query, now) in [
        ("tenant-b", cursor.query_identity.as_str(), 10),
        ("tenant-a", "state=closed;created,id:asc", 10),
        ("tenant-a", "state=open;created,id:desc", 10),
        ("tenant-a", cursor.query_identity.as_str(), 100),
    ] {
        assert!(verify_cursor(&token, key, tenant, query, now).is_err());
    }
    cursor.version = 2;
    assert!(verify_cursor(
        &sign_cursor(&cursor, key),
        key,
        "tenant-a",
        &cursor.query_identity,
        10
    )
    .is_err());
    assert!(verify_cursor(&token, b"wrong-key", "tenant-a", &cursor.query_identity, 10).is_err());
    for bad in [
        "broken".to_string(),
        "x".repeat(4097),
        format!("{}x", token),
    ] {
        assert!(verify_cursor(&bad, key, "tenant-a", &cursor.query_identity, 10).is_err());
    }
    let pool = database("practical_signed_cursor").await;
    sqlx::raw_sql("CREATE TABLE rows (tenant text, id text, created bigint, state text); INSERT INTO rows VALUES ('tenant-a','01',10,'open'),('tenant-a','02',10,'open'),('tenant-a','03',11,'open'),('tenant-b','04',10,'open')").execute(&pool).await.unwrap();
    for deleted in [false, true] {
        if deleted {
            sqlx::query("DELETE FROM rows WHERE tenant='tenant-a' AND id='01'")
                .execute(&pool)
                .await
                .unwrap();
        }
        let ids: Vec<String>=sqlx::query_scalar("SELECT id FROM rows WHERE tenant=$1 AND state=$2 AND (created,id)>($3,$4) ORDER BY created,id LIMIT 2")
            .bind(&accepted.tenant_id).bind("open").bind(accepted.after_created_at_micros).bind(&accepted.after_id).fetch_all(&pool).await.unwrap();
        assert_eq!(ids, ["02", "03"]);
    }
    println!("CURSOR: HMAC-verified scope/query/version/expiry; malformed/oversized/tampered/wrong-key refused; tied timestamps and deleted boundary return [02,03] without tenant-b");
    discard(pool, "practical_signed_cursor").await;
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
struct CacheKey {
    tenant_id: String,
    provider_account_id: String,
    external_record_id: String,
}
#[derive(Clone)]
struct CachedApp {
    pool: PgPool,
    entries: Arc<Mutex<HashMap<CacheKey, Option<String>>>>,
    reads: Arc<AtomicUsize>,
}
fn user(headers: &HeaderMap) -> Result<(&'static str, &'static str), StatusCode> {
    match headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
    {
        Some("Bearer alice") => Ok(("alice", "tenant-a")),
        Some("Bearer bob") => Ok(("bob", "tenant-b")),
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}
async fn cache_key(
    state: &CachedApp,
    headers: &HeaderMap,
    tenant: String,
    account: String,
    external: String,
) -> Result<CacheKey, StatusCode> {
    let (principal, allowed_tenant) = user(headers)?;
    if tenant != allowed_tenant {
        return Err(StatusCode::FORBIDDEN);
    }
    let allowed: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM permissions WHERE principal=$1 AND tenant=$2 AND account=$3)",
    )
    .bind(principal)
    .bind(&tenant)
    .bind(&account)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    if !allowed {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(CacheKey {
        tenant_id: tenant,
        provider_account_id: account,
        external_record_id: external,
    })
}
async fn cached_read(
    State(state): State<CachedApp>,
    headers: HeaderMap,
    Path((tenant, account, external)): Path<(String, String, String)>,
) -> Result<Json<String>, StatusCode> {
    let key = cache_key(&state, &headers, tenant, account, external).await?;
    let cached = state.entries.lock().await.get(&key).cloned();
    let value = if let Some(value) = cached {
        value
    } else {
        state.reads.fetch_add(1, Ordering::SeqCst);
        let value: Option<String> = sqlx::query_scalar(
            "SELECT value FROM records WHERE tenant=$1 AND account=$2 AND external_id=$3",
        )
        .bind(&key.tenant_id)
        .bind(&key.provider_account_id)
        .bind(&key.external_record_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
        state.entries.lock().await.insert(key, value.clone());
        value
    };
    value.map(Json).ok_or(StatusCode::NOT_FOUND)
}
async fn invalidate(
    State(state): State<CachedApp>,
    headers: HeaderMap,
    Path((tenant, account, external)): Path<(String, String, String)>,
) -> Result<StatusCode, StatusCode> {
    let key = cache_key(&state, &headers, tenant, account, external).await?;
    state.entries.lock().await.remove(&key);
    Ok(StatusCode::NO_CONTENT)
}
async fn cache_call(app: &Router, method: &str, token: &str, target: &str) -> (StatusCode, String) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(method)
                .uri(target)
                .header("authorization", token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (status, String::from_utf8(bytes.to_vec()).unwrap())
}
#[tokio::test]
async fn cache_hits_invalidation_and_revocation_follow_authenticated_scope() {
    let pool = database("practical_cache_requests").await;
    sqlx::raw_sql("CREATE TABLE permissions (principal text,tenant text,account text); INSERT INTO permissions VALUES ('alice','tenant-a','a'),('alice','tenant-a','a2'),('bob','tenant-b','b'); CREATE TABLE records (tenant text,account text,external_id text,value text); INSERT INTO records VALUES ('tenant-a','a','42','private-a'),('tenant-a','a2','42','private-a2'),('tenant-b','b','42','private-b')").execute(&pool).await.unwrap();
    let state = CachedApp {
        pool: pool.clone(),
        entries: Arc::new(Mutex::new(HashMap::new())),
        reads: Arc::new(AtomicUsize::new(0)),
    };
    let app = Router::new()
        .route(
            "/cache/{tenant}/{account}/{external}",
            get(cached_read).delete(invalidate),
        )
        .with_state(state.clone());
    for (token, target, value) in [
        ("Bearer alice", "/cache/tenant-a/a/42", "private-a"),
        ("Bearer bob", "/cache/tenant-b/b/42", "private-b"),
        ("Bearer alice", "/cache/tenant-a/a2/42", "private-a2"),
    ] {
        assert_eq!(
            cache_call(&app, "GET", token, target).await,
            (StatusCode::OK, format!("\"{value}\""))
        );
    }
    assert_eq!(
        cache_call(&app, "GET", "Bearer alice", "/cache/tenant-b/b/42")
            .await
            .0,
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        cache_call(&app, "GET", "Bearer alice", "/cache/tenant-a/b/42")
            .await
            .0,
        StatusCode::FORBIDDEN
    );
    sqlx::query("UPDATE records SET value='new-a' WHERE tenant='tenant-a' AND account='a'")
        .execute(&pool)
        .await
        .unwrap();
    assert_eq!(
        cache_call(&app, "DELETE", "Bearer alice", "/cache/tenant-a/a/42")
            .await
            .0,
        StatusCode::NO_CONTENT
    );
    assert_eq!(
        cache_call(&app, "GET", "Bearer alice", "/cache/tenant-a/a/42")
            .await
            .1,
        "\"new-a\""
    );
    assert_eq!(
        cache_call(&app, "GET", "Bearer bob", "/cache/tenant-b/b/42")
            .await
            .1,
        "\"private-b\""
    );
    assert_eq!(state.reads.load(Ordering::SeqCst), 4);
    assert_eq!(
        cache_call(&app, "GET", "Bearer alice", "/cache/tenant-a/a/missing")
            .await
            .0,
        StatusCode::NOT_FOUND
    );
    sqlx::query("DELETE FROM permissions WHERE principal='alice'")
        .execute(&pool)
        .await
        .unwrap();
    assert_eq!(
        cache_call(&app, "GET", "Bearer alice", "/cache/tenant-a/a/42")
            .await
            .0,
        StatusCode::FORBIDDEN
    );
    println!("CACHE: colliding 42 isolated by tenant/account; forged scope denied before cache; invalidation refreshes only A; warm B remains; revoked access denied even with warm value");
    discard(pool, "practical_cache_requests").await;
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
enum ItemOutcome {
    Committed { remote_id: String },
    Rejected { reason_code: String },
    Unresolved,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
struct ItemResult {
    item_key: String,
    outcome: ItemOutcome,
}
fn match_results(
    keys: &[&str],
    results: Vec<ItemResult>,
) -> Result<HashMap<String, ItemOutcome>, &'static str> {
    if keys
        .iter()
        .copied()
        .collect::<std::collections::HashSet<_>>()
        .len()
        != keys.len()
    {
        return Err("duplicate input keys");
    }
    let mut outcomes = HashMap::new();
    for result in results {
        if !keys.contains(&result.item_key.as_str())
            || outcomes.insert(result.item_key, result.outcome).is_some()
        {
            return Err("ambiguous response");
        }
    }
    for key in keys {
        outcomes
            .entry(key.to_string())
            .or_insert(ItemOutcome::Unresolved);
    }
    Ok(outcomes)
}
async fn store_item(pool: &PgPool, key: &str, quantity: i32) -> ItemOutcome {
    if quantity <= 0 {
        return ItemOutcome::Rejected {
            reason_code: "invalid_quantity".into(),
        };
    }
    let mut tx = pool.begin().await.unwrap();
    let inserted: Option<i32> = sqlx::query_scalar(
        "INSERT INTO effects VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING quantity",
    )
    .bind(key)
    .bind(quantity)
    .fetch_optional(&mut *tx)
    .await
    .unwrap();
    let existing: i32 = sqlx::query_scalar("SELECT quantity FROM effects WHERE item_key=$1")
        .bind(key)
        .fetch_one(&mut *tx)
        .await
        .unwrap();
    tx.commit().await.unwrap();
    if inserted.is_none() && existing != quantity {
        ItemOutcome::Rejected {
            reason_code: "payload_conflict".into(),
        }
    } else {
        ItemOutcome::Committed {
            remote_id: key.into(),
        }
    }
}
#[tokio::test]
async fn bulk_results_preserve_identity_and_retry_only_the_known_unaccepted_item() {
    let pool = database("practical_bulk_outcomes").await;
    sqlx::query("CREATE TABLE effects (item_key text PRIMARY KEY,quantity integer NOT NULL)")
        .execute(&pool)
        .await
        .unwrap();
    for (key, quantity) in [("a", 1), ("c", 2)] {
        assert!(matches!(
            store_item(&pool, key, quantity).await,
            ItemOutcome::Committed { .. }
        ));
    }
    let wire = serde_json::to_vec(&vec![
        ItemResult {
            item_key: "d".into(),
            outcome: ItemOutcome::Rejected {
                reason_code: "temporary_not_accepted".into(),
            },
        },
        ItemResult {
            item_key: "b".into(),
            outcome: ItemOutcome::Rejected {
                reason_code: "invalid_quantity".into(),
            },
        },
        ItemResult {
            item_key: "a".into(),
            outcome: ItemOutcome::Committed {
                remote_id: "a".into(),
            },
        },
    ])
    .unwrap();
    let outcomes = match_results(
        &["a", "b", "c", "d"],
        serde_json::from_slice(&wire).unwrap(),
    )
    .unwrap();
    assert_eq!(outcomes["c"], ItemOutcome::Unresolved);
    assert!(match_results(
        &["a"],
        vec![
            ItemResult {
                item_key: "a".into(),
                outcome: ItemOutcome::Unresolved
            },
            ItemResult {
                item_key: "a".into(),
                outcome: ItemOutcome::Unresolved
            }
        ]
    )
    .is_err());
    assert!(match_results(
        &["a"],
        vec![ItemResult {
            item_key: "unknown".into(),
            outcome: ItemOutcome::Unresolved
        }]
    )
    .is_err());
    assert!(match_results(&["a", "a"], Vec::new()).is_err());
    let recovered: Option<i32> =
        sqlx::query_scalar("SELECT quantity FROM effects WHERE item_key='c'")
            .fetch_optional(&pool)
            .await
            .unwrap();
    assert_eq!(recovered, Some(2));
    let retry: Vec<_>=outcomes.iter().filter_map(|(key,outcome)|if matches!(outcome,ItemOutcome::Rejected{reason_code} if reason_code=="temporary_not_accepted"){Some(key.clone())}else{None}).collect();
    assert_eq!(retry, vec!["d"]);
    for key in retry {
        assert!(matches!(
            store_item(&pool, &key, 3).await,
            ItemOutcome::Committed { .. }
        ));
    }
    assert!(
        matches!(store_item(&pool,"d",5).await,ItemOutcome::Rejected{reason_code}if reason_code=="payload_conflict")
    );
    drop(wire);
    for (key, quantity) in [("a", 1), ("b", -1), ("c", 2), ("d", 3)] {
        let outcome = store_item(&pool, key, quantity).await;
        assert_eq!(matches!(outcome, ItemOutcome::Committed { .. }), key != "b");
    }
    let stored: Vec<String> = sqlx::query_scalar("SELECT item_key FROM effects ORDER BY item_key")
        .fetch_all(&pool)
        .await
        .unwrap();
    assert_eq!(stored, ["a", "c", "d"]);
    println!("BULK: reordered response matched by identity; absent C unresolved then found committed; duplicate/unknown keys refused; only known-unaccepted D retried; stored=[a,c,d]");
    discard(pool, "practical_bulk_outcomes").await;
}
