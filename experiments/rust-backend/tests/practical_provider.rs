use axum::{extract::{Path, State},http::StatusCode,routing::{get,post},Json,Router};
use rust_backend_labs::{database,discard};
use serde::{Deserialize,Serialize};
use sqlx::PgPool;
use std::{sync::{Arc,atomic::{AtomicBool,AtomicUsize,Ordering}},time::{Duration,Instant}};
use tokio::sync::oneshot;

#[derive(Clone,Serialize,Deserialize)]
struct Intent {operation_id:String,units:i32}
#[derive(Clone)]
struct Provider {pool:PgPool,calls:Arc<AtomicUsize>,lookup_available:Arc<AtomicBool>}
async fn place(State(provider):State<Provider>,Path(mode):Path<String>,Json(intent):Json<Intent>) -> (StatusCode,Json<serde_json::Value>) {
    provider.calls.fetch_add(1,Ordering::SeqCst);
    if intent.units<=0 || intent.operation_id.is_empty() || intent.operation_id.len()>64 {return (StatusCode::UNPROCESSABLE_ENTITY,Json(serde_json::json!({"code":"invalid_input"})));}
    let mut tx=provider.pool.begin().await.unwrap();
    let inserted:Option<String>=sqlx::query_scalar("INSERT INTO provider_orders VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING remote_id")
        .bind(&intent.operation_id).bind(intent.units).bind(format!("remote-{}",intent.operation_id)).fetch_optional(&mut *tx).await.unwrap();
    let stored:(i32,String)=sqlx::query_as("SELECT units,remote_id FROM provider_orders WHERE operation_id=$1").bind(&intent.operation_id).fetch_one(&mut *tx).await.unwrap();
    if inserted.is_none() && stored.0!=intent.units {tx.rollback().await.unwrap();return (StatusCode::CONFLICT,Json(serde_json::json!({"code":"payload_conflict"})));}
    tx.commit().await.unwrap();
    if mode=="drop" {panic!("controlled provider connection failure after commit");}
    if mode=="retry" {return (StatusCode::SERVICE_UNAVAILABLE,Json(serde_json::json!({"code":"reply_unavailable"})));}
    (StatusCode::CREATED,Json(serde_json::json!({"remote_id":stored.1})))
}
async fn lookup(State(provider):State<Provider>,Path(operation):Path<String>) -> (StatusCode,Json<serde_json::Value>) {
    if !provider.lookup_available.load(Ordering::SeqCst) {return (StatusCode::SERVICE_UNAVAILABLE,Json(serde_json::json!({"code":"lookup_unavailable"})));}
    let result:Option<String>=sqlx::query_scalar("SELECT remote_id FROM provider_orders WHERE operation_id=$1").bind(operation).fetch_optional(&provider.pool).await.unwrap();
    match result {Some(id)=>(StatusCode::OK,Json(serde_json::json!({"remote_id":id}))),None=>(StatusCode::NOT_FOUND,Json(serde_json::json!({"code":"not_found"})))}
}
async fn server(schema:&'static str) -> (Provider,String,tokio::task::JoinHandle<()>) {
    let pool=database(schema).await;
    sqlx::raw_sql("CREATE TABLE provider_orders (operation_id text PRIMARY KEY,units integer NOT NULL,remote_id text NOT NULL); CREATE TABLE client_operations (operation_id text PRIMARY KEY,units integer NOT NULL,state text NOT NULL,remote_id text)").execute(&pool).await.unwrap();
    let state=Provider {pool,calls:Arc::new(AtomicUsize::new(0)),lookup_available:Arc::new(AtomicBool::new(true))};
    let app=Router::new().route("/write/{mode}",post(place)).route("/outcome/{operation}",get(lookup)).with_state(state.clone());
    let listener=tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();let url=format!("http://{}",listener.local_addr().unwrap());
    let task=tokio::spawn(async move {axum::serve(listener,app).await.unwrap();});(state,url,task)
}
#[derive(Debug)]
enum WriteOutcome {Confirmed {remote_id:String},Rejected {reason_code:String},Unresolved {operation_id:String}}
async fn write(client:&reqwest::Client,url:&str,mode:&str,intent:&Intent) -> WriteOutcome {
    let response=client.post(format!("{url}/write/{mode}")).header("content-type","application/json").body(serde_json::to_vec(intent).unwrap()).send().await;
    match response {
        Ok(response) if response.status()==StatusCode::CREATED=>{
            let bytes=response.bytes().await.unwrap();let result:serde_json::Value=serde_json::from_slice(&bytes).unwrap();WriteOutcome::Confirmed{remote_id:result["remote_id"].as_str().unwrap().into()}
        }
        Ok(response) if response.status()==StatusCode::CONFLICT||response.status()==StatusCode::UNPROCESSABLE_ENTITY=>WriteOutcome::Rejected{reason_code:response.status().as_str().into()},
        _=>WriteOutcome::Unresolved{operation_id:intent.operation_id.clone()},
    }
}
#[tokio::test]
async fn a_provider_connection_can_fail_after_commit_and_recover_by_the_same_operation() {
    let (provider,url,server)=server("practical_http_uncertainty").await;let client=reqwest::Client::builder().timeout(Duration::from_secs(2)).build().unwrap();
    let intent=Intent {operation_id:"order-42".into(),units:3};
    sqlx::query("INSERT INTO client_operations VALUES ($1,$2,'pending',NULL)").bind(&intent.operation_id).bind(intent.units).execute(&provider.pool).await.unwrap();
    assert!(matches!(write(&client,&url,"drop",&intent).await,WriteOutcome::Unresolved{operation_id} if operation_id=="order-42"));
    sqlx::query("UPDATE client_operations SET state='unresolved' WHERE operation_id=$1").bind(&intent.operation_id).execute(&provider.pool).await.unwrap();
    provider.lookup_available.store(false,Ordering::SeqCst);
    assert_eq!(client.get(format!("{url}/outcome/order-42")).send().await.unwrap().status(),StatusCode::SERVICE_UNAVAILABLE);
    provider.lookup_available.store(true,Ordering::SeqCst);
    let response=client.get(format!("{url}/outcome/order-42")).send().await.unwrap();assert_eq!(response.status(),StatusCode::OK);
    let payload:serde_json::Value=serde_json::from_slice(&response.bytes().await.unwrap()).unwrap();let id=payload["remote_id"].as_str().unwrap();
    sqlx::query("UPDATE client_operations SET state='confirmed',remote_id=$2 WHERE operation_id=$1").bind(&intent.operation_id).bind(id).execute(&provider.pool).await.unwrap();
    assert!(matches!(write(&client,&url,"normal",&intent).await,WriteOutcome::Confirmed{remote_id} if remote_id==id));
    let changed=Intent {units:4,..intent.clone()};assert!(matches!(write(&client,&url,"normal",&changed).await,WriteOutcome::Rejected{reason_code} if reason_code=="409"));
    let invalid=Intent {operation_id:"rejected".into(),units:0};assert!(matches!(write(&client,&url,"normal",&invalid).await,WriteOutcome::Rejected{reason_code} if reason_code=="422"));
    let rows:i64=sqlx::query_scalar("SELECT count(*) FROM provider_orders").fetch_one(&provider.pool).await.unwrap();assert_eq!(rows,1);
    let local:(String,String)=sqlx::query_as("SELECT state,remote_id FROM client_operations").fetch_one(&provider.pool).await.unwrap();assert_eq!(local,("confirmed".into(),id.into()));
    println!("PROVIDER_OUTCOME: actual HTTP connection fails after committed order; unavailable lookup stays unresolved; recovered id=remote-order-42; same-key repeat=one order; changed payload=409; invalid input=422");
    server.abort();assert!(server.await.unwrap_err().is_cancelled());discard(provider.pool,"practical_http_uncertainty").await;
}

struct AttemptBudget {remaining:u32,deadline:std::time::Instant}
impl AttemptBudget {
    fn claim(&mut self,now:std::time::Instant)->bool {if now>=self.deadline||self.remaining==0{return false;}self.remaining-=1;true}
}
struct RetryPause {entered:oneshot::Sender<()>,resume:oneshot::Receiver<()>}
async fn bounded_retries(client:&reqwest::Client,url:&str,intent:&Intent,mut budget:AttemptBudget,mut pause:Option<RetryPause>) -> usize {
    let mut attempts=0;
    while budget.claim(Instant::now()) {
        let remaining=budget.deadline.saturating_duration_since(Instant::now());if remaining.is_zero(){break;}
        let _=client.post(format!("{url}/write/retry")).header("content-type","application/json").body(serde_json::to_vec(intent).unwrap()).timeout(remaining.min(Duration::from_secs(1))).send().await.unwrap();attempts+=1;
        if let Some(control)=pause.take(){control.entered.send(()).unwrap();control.resume.await.unwrap();}
        let delay=Duration::from_millis(((7+attempts*3)%7+1)as u64);if delay>=budget.deadline.saturating_duration_since(Instant::now()){break;}tokio::time::sleep(delay).await;
    }
    attempts
}
#[tokio::test]
async fn nested_retry_owners_multiply_real_http_attempts_and_one_budget_limits_them() {
    let (provider,url,server)=server("practical_http_retries").await;let client=reqwest::Client::new();
    let nested=Intent{operation_id:"nested".into(),units:1};
    for _ in 0..3 {for _ in 0..3 {let response=client.post(format!("{url}/write/retry")).header("content-type","application/json").body(serde_json::to_vec(&nested).unwrap()).send().await.unwrap();assert_eq!(response.status(),StatusCode::SERVICE_UNAVAILABLE);}}
    assert_eq!(provider.calls.load(Ordering::SeqCst),9);
    let bounded=Intent{operation_id:"bounded".into(),units:1};
    assert_eq!(bounded_retries(&client,&url,&bounded,AttemptBudget{remaining:3,deadline:Instant::now()+Duration::from_secs(5)},None).await,3);assert_eq!(provider.calls.load(Ordering::SeqCst),12);
    assert_eq!(bounded_retries(&client,&url,&bounded,AttemptBudget{remaining:3,deadline:Instant::now()},None).await,0);assert_eq!(provider.calls.load(Ordering::SeqCst),12);
    let (entered,observed)=oneshot::channel();let (_release,resume)=oneshot::channel();let worker_client=client.clone();let worker_url=url.clone();
    let task=tokio::spawn(async move{bounded_retries(&worker_client,&worker_url,&Intent{operation_id:"cancelled".into(),units:1},AttemptBudget{remaining:3,deadline:Instant::now()+Duration::from_secs(5)},Some(RetryPause{entered,resume})).await});
    observed.await.unwrap();task.abort();assert!(task.await.unwrap_err().is_cancelled());assert_eq!(provider.calls.load(Ordering::SeqCst),13);
    let orders:i64=sqlx::query_scalar("SELECT count(*) FROM provider_orders").fetch_one(&provider.pool).await.unwrap();assert_eq!(orders,3);
    println!("RETRY_OWNERS: three-by-three wrapper makes 9 HTTP attempts; single owner makes 3; expired deadline starts 0; cancellation at backoff starts no next attempt; three logical keys produce three stored orders");
    server.abort();assert!(server.await.unwrap_err().is_cancelled());discard(provider.pool,"practical_http_retries").await;
}
