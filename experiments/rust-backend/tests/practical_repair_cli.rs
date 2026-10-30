use rust_backend_labs::{database,discard,practical_repair::{apply,preview}};

#[tokio::test]
async fn saved_preview_respects_staleness_scope_environment_and_replay() {
    let pool=database("practical_repair_cli").await;
    sqlx::raw_sql("CREATE TABLE repair_environment(name text); INSERT INTO repair_environment VALUES('fixture-staging'); CREATE TABLE repair_operators(actor text,tenant_id text); INSERT INTO repair_operators SELECT current_user,'tenant-a'; CREATE TABLE repair_accounts(tenant_id text,id bigint,version bigint,status text,PRIMARY KEY(tenant_id,id)); INSERT INTO repair_accounts VALUES('tenant-a',1,1,'missing'),('tenant-a',2,1,'missing'),('tenant-b',1,1,'missing'); CREATE TABLE repair_plans(id text PRIMARY KEY,payload bytea); CREATE TABLE repair_outcomes(plan_id text,record_id bigint,outcome text,PRIMARY KEY(plan_id,record_id))").execute(&pool).await.unwrap();
    assert!(preview(&pool,"tenant-b",10).await.is_err());assert!(preview(&pool,"tenant-a",1).await.is_err());assert!(preview(&pool,"tenant-a",11).await.is_err());
    let bytes=preview(&pool,"tenant-a",10).await.unwrap();
    let mut altered:serde_json::Value=serde_json::from_slice(&bytes).unwrap();altered["changes"][0]["replacement_status"]="arbitrary".into();assert!(apply(&pool,&serde_json::to_vec(&altered).unwrap()).await.is_err());
    sqlx::query("UPDATE repair_environment SET name='fixture-production'").execute(&pool).await.unwrap();assert!(apply(&pool,&bytes).await.is_err());sqlx::query("UPDATE repair_environment SET name='fixture-staging'").execute(&pool).await.unwrap();
    let mut other=pool.acquire().await.unwrap();sqlx::query("UPDATE repair_accounts SET version=2,status='newer' WHERE tenant_id='tenant-a' AND id=1").execute(&mut *other).await.unwrap();drop(other);
    let outcomes=apply(&pool,&bytes).await.unwrap();assert_eq!(outcomes,vec![(1,"conflict".into()),(2,"applied".into())]);assert_eq!(apply(&pool,&bytes).await.unwrap(),outcomes);
    let stored:Vec<(String,i64,i64,String)>=sqlx::query_as("SELECT tenant_id,id,version,status FROM repair_accounts ORDER BY tenant_id,id").fetch_all(&pool).await.unwrap();assert_eq!(stored,vec![("tenant-a".into(),1,2,"newer".into()),("tenant-a".into(),2,2,"ready".into()),("tenant-b".into(),1,1,"missing".into())]);
    sqlx::query("DELETE FROM repair_operators").execute(&pool).await.unwrap();assert!(apply(&pool,&bytes).await.is_err());assert!(apply(&pool,&vec![b'x';8193]).await.is_err());
    println!("REPAIR_PLAN: bounded server-saved exact bytes; altered/foreign/oversized/environment-mismatched plans denied; stale row conflicts, unchanged row applies; replay preserves outcomes and versions; revoked operator denied");
    discard(pool,"practical_repair_cli").await;
}
