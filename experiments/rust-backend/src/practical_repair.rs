use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::PgPool;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PlannedChange {
    pub tenant_id: String,
    pub record_id: i64,
    pub expected_version: i64,
    pub replacement_status: String,
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Plan {
    pub schema_version: u8,
    pub actor: String,
    pub environment: String,
    pub changes: Vec<PlannedChange>,
}
pub type RepairResult<T> = Result<T, Box<dyn std::error::Error + Send + Sync>>;
fn digest(bytes: &[u8]) -> String {
    Sha256::digest(bytes).iter().map(|byte| format!("{byte:02x}")).collect()
}
async fn identity(pool: &PgPool) -> RepairResult<(String, String)> {
    Ok(sqlx::query_as("SELECT current_user::text, name FROM repair_environment").fetch_one(pool).await?)
}
async fn authorized(pool: &PgPool, actor: &str, tenant: &str) -> RepairResult<bool> {
    Ok(sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM repair_operators WHERE actor=$1 AND tenant_id=$2)").bind(actor).bind(tenant).fetch_one(pool).await?)
}
pub async fn preview(pool: &PgPool, tenant: &str, limit: usize) -> RepairResult<Vec<u8>> {
    if !(1..=10).contains(&limit) {return Err("selection limit must be 1..10".into());}
    let (actor, environment) = identity(pool).await?;
    if !authorized(pool, &actor, tenant).await? {return Err("operator scope denied".into());}
    let rows: Vec<(i64, i64)> = sqlx::query_as("SELECT id,version FROM repair_accounts WHERE tenant_id=$1 AND status='missing' ORDER BY id LIMIT $2").bind(tenant).bind((limit+1) as i64).fetch_all(pool).await?;
    if rows.len()>limit {return Err("scope exceeds preview limit".into());}
    let plan=Plan {schema_version:1,actor,environment,changes:rows.into_iter().map(|(record_id,expected_version)|PlannedChange {tenant_id:tenant.into(),record_id,expected_version,replacement_status:"ready".into()}).collect()};
    let bytes=serde_json::to_vec(&plan)?;
    sqlx::query("INSERT INTO repair_plans(id,payload) VALUES($1,$2) ON CONFLICT DO NOTHING").bind(digest(&bytes)).bind(&bytes).execute(pool).await?;
    Ok(bytes)
}
pub async fn apply(pool: &PgPool, bytes: &[u8]) -> RepairResult<Vec<(i64, String)>> {
    if bytes.len()>8192 {return Err("plan too large".into());}
    let plan:Plan=serde_json::from_slice(bytes)?;
    let (actor,environment)=identity(pool).await?;
    if plan.schema_version!=1 || plan.actor!=actor || plan.environment!=environment || plan.changes.len()>10 {return Err("plan context mismatch".into());}
    for change in &plan.changes {if !authorized(pool,&actor,&change.tenant_id).await? {return Err("operator scope denied".into());}}
    let id=digest(bytes);
    let mut tx=pool.begin().await?;
    let saved:Option<Vec<u8>>=sqlx::query_scalar("SELECT payload FROM repair_plans WHERE id=$1 FOR UPDATE").bind(&id).fetch_optional(&mut *tx).await?;
    if saved.as_deref()!=Some(bytes) {return Err("plan was not saved by preview".into());}
    let mut outcomes=Vec::new();
    for change in &plan.changes {
        let prior:Option<String>=sqlx::query_scalar("SELECT outcome FROM repair_outcomes WHERE plan_id=$1 AND record_id=$2").bind(&id).bind(change.record_id).fetch_optional(&mut *tx).await?;
        let outcome=if let Some(prior)=prior {prior} else {
            let changed = sqlx::query(
                "UPDATE repair_accounts SET status=$1,version=version+1
                 WHERE tenant_id=$2 AND id=$3 AND version=$4",
            ).bind(&change.replacement_status).bind(&change.tenant_id).bind(change.record_id).bind(change.expected_version).execute(&mut *tx).await?.rows_affected();
            let outcome=if changed==1 {"applied"} else {"conflict"};
            sqlx::query("INSERT INTO repair_outcomes VALUES($1,$2,$3)").bind(&id).bind(change.record_id).bind(outcome).execute(&mut *tx).await?;
            outcome.to_owned()
        };
        outcomes.push((change.record_id,outcome));
    }
    tx.commit().await?;
    Ok(outcomes)
}
