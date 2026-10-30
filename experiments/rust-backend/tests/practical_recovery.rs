use axum::{body::{Body,Bytes},extract::{DefaultBodyLimit,Path,State},http::{HeaderMap,Request,StatusCode},routing::{get,post},Json,Router};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD,Engine};
use hmac::{Hmac,Mac};
use http_body_util::BodyExt;
use rust_backend_labs::{database,discard,leases};
use serde::{Deserialize,Serialize};
use sha2::{Digest,Sha256};
use sqlx::PgPool;
use std::{sync::{Arc,atomic::{AtomicBool,Ordering}},time::Duration};
use tokio::sync::oneshot;
use tower::ServiceExt;

fn allowed(headers:&HeaderMap,tenant:&str)->bool {
    matches!((headers.get("authorization").and_then(|value|value.to_str().ok()),tenant),(Some("Bearer alice"),"tenant-a")|(Some("Bearer bob"),"tenant-b"))
}
#[derive(Serialize)]
enum RecordView<T> {Current(T),Stale{value:T,repair_id:String},Pending{repair_id:String},Unavailable}
async fn record(State(pool):State<PgPool>,headers:HeaderMap,Path(tenant):Path<String>)->(StatusCode,Json<RecordView<String>>) {
    if !allowed(&headers,&tenant){return (StatusCode::FORBIDDEN,Json(RecordView::Unavailable));}
    let job:Option<(i64,Option<String>)>=sqlx::query_as("SELECT j.id,e.value FROM jobs j LEFT JOIN effects e ON e.job_id=j.id WHERE j.tenant=$1").bind(tenant).fetch_optional(&pool).await.unwrap();
    match job {Some((_,Some(value)))=>(StatusCode::OK,Json(RecordView::Current(value))),Some((id,None))=>(StatusCode::OK,Json(RecordView::Pending{repair_id:id.to_string()})),None=>(StatusCode::SERVICE_UNAVAILABLE,Json(RecordView::Unavailable))}
}
async fn request_repair(State(pool):State<PgPool>,headers:HeaderMap,Path(tenant):Path<String>)->(StatusCode,Json<serde_json::Value>) {
    if !allowed(&headers,&tenant){return (StatusCode::FORBIDDEN,Json(serde_json::json!({"code":"forbidden"})));}
    sqlx::query("INSERT INTO jobs(tenant,state,epoch) VALUES ($1,'pending',0) ON CONFLICT(tenant) DO NOTHING").bind(&tenant).execute(&pool).await.unwrap();
    let id:i64=sqlx::query_scalar("SELECT id FROM jobs WHERE tenant=$1").bind(&tenant).fetch_one(&pool).await.unwrap();
    (StatusCode::ACCEPTED,Json(serde_json::json!({"repair_id":id})))
}
fn repair_app(pool:PgPool)->Router {Router::new().route("/records/{tenant}",get(record)).route("/repairs/{tenant}",post(request_repair)).with_state(pool)}
async fn call(app:&Router,method:&str,path:&str,token:&str)->(StatusCode,String) {
    let response=app.clone().oneshot(Request::builder().method(method).uri(path).header("authorization",token).body(Body::empty()).unwrap()).await.unwrap();
    let status=response.status();let bytes=response.into_body().collect().await.unwrap().to_bytes();(status,String::from_utf8(bytes.to_vec()).unwrap())
}
async fn reopen(schema:&'static str)->PgPool {
    sqlx::postgres::PgPoolOptions::new().max_connections(2).after_connect(move|connection,_|Box::pin(async move {sqlx::query(&format!("SET search_path={schema}")).execute(connection).await?;Ok(())}))
        .connect(&std::env::var("SQL_RUST_PG_URL").unwrap()).await.unwrap()
}
#[tokio::test]
async fn get_does_not_start_repairs_and_an_authorized_durable_job_recovers_its_lease() {
    const SCHEMA:&str="practical_repair_discovery";let pool=database(SCHEMA).await;
    sqlx::raw_sql("CREATE TABLE jobs(id bigserial PRIMARY KEY,tenant text UNIQUE,owner text,epoch bigint NOT NULL DEFAULT 0,lease_until timestamptz,state text NOT NULL); CREATE TABLE effects(job_id bigint PRIMARY KEY,value text NOT NULL)").execute(&pool).await.unwrap();
    let app=repair_app(pool.clone());
    for _ in 0..3 {assert_eq!(call(&app,"GET","/records/tenant-a","Bearer alice").await.0,StatusCode::SERVICE_UNAVAILABLE);}
    let count:i64=sqlx::query_scalar("SELECT count(*) FROM jobs").fetch_one(&pool).await.unwrap();assert_eq!(count,0);
    assert_eq!(call(&app,"POST","/repairs/tenant-b","Bearer alice").await.0,StatusCode::FORBIDDEN);
    for _ in 0..3 {assert_eq!(call(&app,"POST","/repairs/tenant-a","Bearer alice").await.0,StatusCode::ACCEPTED);}
    let count:i64=sqlx::query_scalar("SELECT count(*) FROM jobs").fetch_one(&pool).await.unwrap();assert_eq!(count,1);
    assert!(call(&app,"GET","/records/tenant-a","Bearer alice").await.1.contains("Pending"));
    let worker_pool=pool.clone();let (claimed,observed)=oneshot::channel();
    let worker=tokio::spawn(async move{let epoch=leases::claim(&worker_pool,1,"worker-a").await.unwrap().unwrap();claimed.send(epoch).unwrap();std::future::pending::<()>().await;});
    let old_epoch=observed.await.unwrap();worker.abort();assert!(worker.await.unwrap_err().is_cancelled());
    sqlx::query("UPDATE jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id=1").execute(&pool).await.unwrap();
    let restarted=reopen(SCHEMA).await;let epoch=leases::claim(&restarted,1,"worker-b").await.unwrap().unwrap();assert!(epoch>old_epoch);
    assert_eq!(leases::finish(&restarted,1,epoch,"repaired").await.unwrap(),1);
    assert_eq!(leases::finish(&pool,1,old_epoch,"stale repair").await.unwrap(),0);
    let response=call(&repair_app(restarted.clone()),"GET","/records/tenant-a","Bearer alice").await;assert_eq!(response.0,StatusCode::OK);assert!(response.1.contains("repaired"));
    println!("READ_REPAIR: three GETs create zero jobs; unauthorized POST denied; repeated authorized POSTs create one job; stopped worker lease is explicitly expired; new worker completes, stale epoch writes zero; GET returns repaired");
    restarted.close().await;discard(pool,SCHEMA).await;
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Event {event_id:String,units:i32}
#[derive(Clone)]
struct Inbox {pool:PgPool,fail_before_commit:Arc<AtomicBool>}
const KEY:&[u8]=b"fixture-inbox-signature-key-not-a-production-secret";
fn signature(body:&[u8])->String {let mut mac=Hmac::<Sha256>::new_from_slice(KEY).unwrap();mac.update(body);URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())}
async fn receive(State(inbox):State<Inbox>,headers:HeaderMap,body:Bytes)->StatusCode {
    if body.len()>256{return StatusCode::PAYLOAD_TOO_LARGE;}
    let encoded=headers.get("x-signature").and_then(|value|value.to_str().ok()).filter(|value|value.len()<=128);
    let Some(tag)=encoded.and_then(|value|URL_SAFE_NO_PAD.decode(value).ok())else{return StatusCode::UNAUTHORIZED;};
    let mut mac=Hmac::<Sha256>::new_from_slice(KEY).unwrap();mac.update(&body);if mac.verify_slice(&tag).is_err(){return StatusCode::UNAUTHORIZED;}
    let event:Event=match serde_json::from_slice(&body){Ok(value)=>value,Err(_)=>return StatusCode::BAD_REQUEST};
    if event.event_id.is_empty()||event.event_id.len()>64||event.units<=0{return StatusCode::BAD_REQUEST;}
    let hash=Sha256::digest(&body).iter().map(|byte|format!("{byte:02x}")).collect::<String>();
    let mut tx=inbox.pool.begin().await.unwrap();
    sqlx::query("INSERT INTO webhook_receipts VALUES ('tenant-a','fixture',$1,$2,$3,'pending') ON CONFLICT DO NOTHING").bind(&event.event_id).bind(&hash).bind(body.as_ref()).execute(&mut *tx).await.unwrap();
    let original:String=sqlx::query_scalar("SELECT payload_hash FROM webhook_receipts WHERE tenant_id='tenant-a' AND provider='fixture' AND event_id=$1").bind(&event.event_id).fetch_one(&mut *tx).await.unwrap();
    if original!=hash{tx.rollback().await.unwrap();return StatusCode::CONFLICT;}
    if inbox.fail_before_commit.load(Ordering::SeqCst){tx.rollback().await.unwrap();return StatusCode::SERVICE_UNAVAILABLE;}
    tx.commit().await.unwrap();StatusCode::ACCEPTED
}
struct Pause {entered:oneshot::Sender<()>,resume:oneshot::Receiver<()>}
async fn apply_receipt(pool:&PgPool,event_id:&str,pause:Option<Pause>)->Result<(),sqlx::Error> {
    let mut tx=pool.begin().await?;
    let (payload,state):(Vec<u8>,String)=sqlx::query_as("SELECT payload,state FROM webhook_receipts WHERE tenant_id='tenant-a' AND provider='fixture' AND event_id=$1 FOR UPDATE").bind(event_id).fetch_one(&mut *tx).await?;
    if state=="applied"{tx.rollback().await?;return Ok(());}
    let event:Event=serde_json::from_slice(&payload).unwrap();
    let first:Option<String>=sqlx::query_scalar("INSERT INTO applied_events VALUES ($1) ON CONFLICT DO NOTHING RETURNING event_id").bind(event_id).fetch_optional(&mut *tx).await?;
    if first.is_some(){sqlx::query("UPDATE business_counter SET value=value+$1").bind(event.units).execute(&mut *tx).await?;}
    sqlx::query("UPDATE webhook_receipts SET state='applied' WHERE tenant_id='tenant-a' AND provider='fixture' AND event_id=$1").bind(event_id).execute(&mut *tx).await?;
    if let Some(pause)=pause{pause.entered.send(()).unwrap();pause.resume.await.unwrap();}
    tx.commit().await
}
async fn delivery(app:&Router,body:&[u8],signed:bool)->axum::response::Response {
    app.clone().oneshot(Request::post("/inbox").header("x-signature",if signed{signature(body)}else{"invalid".into()}).body(Body::from(body.to_vec())).unwrap()).await.unwrap()
}
#[tokio::test]
async fn signed_receipts_recover_pending_work_and_commit_application_only_once() {
    const SCHEMA:&str="practical_inbox_recovery";let pool=database(SCHEMA).await;
    sqlx::raw_sql("CREATE TABLE webhook_receipts(tenant_id text,provider text,event_id text,payload_hash text NOT NULL,payload bytea NOT NULL,state text NOT NULL,PRIMARY KEY(tenant_id,provider,event_id)); CREATE TABLE applied_events(event_id text PRIMARY KEY); CREATE TABLE business_counter(value integer); INSERT INTO business_counter VALUES(0)").execute(&pool).await.unwrap();
    let state=Inbox{pool:pool.clone(),fail_before_commit:Arc::new(AtomicBool::new(true))};
    let app=Router::new().route("/inbox",post(receive)).layer(DefaultBodyLimit::max(256)).with_state(state.clone());
    let body=br#"{"event_id":"event-39","units":3}"#;
    assert_eq!(delivery(&app,body,false).await.status(),StatusCode::UNAUTHORIZED);
    assert_eq!(delivery(&app,body,true).await.status(),StatusCode::SERVICE_UNAVAILABLE);
    let count:i64=sqlx::query_scalar("SELECT count(*) FROM webhook_receipts").fetch_one(&pool).await.unwrap();assert_eq!(count,0);
    state.fail_before_commit.store(false,Ordering::SeqCst);let acknowledgement=delivery(&app,body,true).await;assert_eq!(acknowledgement.status(),StatusCode::ACCEPTED);drop(acknowledgement);
    let fresh=reopen(SCHEMA).await;let saved:(Vec<u8>,String)=sqlx::query_as("SELECT payload,state FROM webhook_receipts").fetch_one(&fresh).await.unwrap();assert_eq!(saved,(body.to_vec(),"pending".into()));
    let (entered,observed)=oneshot::channel();let (_release,resume)=oneshot::channel();let worker_pool=fresh.clone();
    let worker=tokio::spawn(async move{apply_receipt(&worker_pool,"event-39",Some(Pause{entered,resume})).await.unwrap();});
    observed.await.unwrap();worker.abort();assert!(worker.await.unwrap_err().is_cancelled());
    let before:i32=sqlx::query_scalar("SELECT value FROM business_counter").fetch_one(&pool).await.unwrap();assert_eq!(before,0);
    tokio::time::timeout(Duration::from_secs(3),apply_receipt(&fresh,"event-39",None)).await.unwrap().unwrap();
    apply_receipt(&fresh,"event-39",None).await.unwrap();
    assert_eq!(delivery(&app,body,true).await.status(),StatusCode::ACCEPTED);
    assert_eq!(delivery(&app,br#"{"event_id":"event-39","units":4}"#,true).await.status(),StatusCode::CONFLICT);
    let stored:(i32,i64,String)=sqlx::query_as("SELECT value,(SELECT count(*) FROM applied_events),(SELECT state FROM webhook_receipts) FROM business_counter").fetch_one(&pool).await.unwrap();assert_eq!(stored,(3,1,"applied".into()));
    println!("INBOX: invalid signature=401; rollback before acceptance=503 and zero receipts; unconsumed acknowledgement leaves pending bytes; cancelled application transaction leaves zero effect; fresh worker and duplicate replay yield counter=3 and one applied claim; changed signed payload=409");
    fresh.close().await;discard(pool,SCHEMA).await;
}
