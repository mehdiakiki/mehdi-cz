use axum::{extract::State,http::{HeaderMap,HeaderValue},routing::get,Router};
use std::{sync::{Arc,atomic::{AtomicUsize,Ordering}},time::{Duration,Instant}};
use tokio::{sync::Semaphore,task::JoinSet};

struct Gauge(Arc<AtomicUsize>);
impl Gauge { fn enter(value: Arc<AtomicUsize>) -> Self { value.fetch_add(1,Ordering::SeqCst);Self(value) } }
impl Drop for Gauge { fn drop(&mut self) { self.0.fetch_sub(1,Ordering::SeqCst); } }
#[derive(Clone)]
struct Server {slots: Arc<Semaphore>,queued: Arc<AtomicUsize>,active: Arc<AtomicUsize>,peak: Arc<AtomicUsize>}
async fn work(State(server): State<Server>) -> (HeaderMap,&'static str) {
    let queued=Gauge::enter(server.queued.clone());let started=Instant::now();
    let _permit=server.slots.acquire().await.unwrap();let queue_us=started.elapsed().as_micros();drop(queued);
    let _active=Gauge::enter(server.active.clone());server.peak.fetch_max(server.active.load(Ordering::SeqCst),Ordering::SeqCst);
    tokio::time::sleep(Duration::from_millis(20)).await;
    let mut headers=HeaderMap::new();headers.insert("x-queue-us",HeaderValue::from_str(&queue_us.to_string()).unwrap());(headers,"ok")
}
fn percentile(values: &mut [u128],percent: usize) -> Option<u128> {
    if values.is_empty() {return None;}values.sort();Some(values[(values.len()*percent).div_ceil(100).saturating_sub(1).min(values.len()-1)])
}
async fn request(client: reqwest::Client,url: String) -> (u128,Option<u128>,&'static str) {
    let started=Instant::now();
    let result=tokio::time::timeout(Duration::from_millis(80),async {
        let response=client.get(url).send().await?.error_for_status()?;
        let queued=response.headers().get("x-queue-us").and_then(|value|value.to_str().ok()).and_then(|value|value.parse::<u128>().ok());
        let body=response.bytes().await?;assert_eq!(body.as_ref(),b"ok");Ok::<_,reqwest::Error>(queued)
    }).await;
    match result {Ok(Ok(queued))=>(started.elapsed().as_micros(),queued,"ok"),Ok(Err(_))=>(started.elapsed().as_micros(),None,"transport"),Err(_)=>(started.elapsed().as_micros(),None,"timeout")}
}
async fn sample(suite: &str,round: usize,workers: usize,concurrency: usize) {
    const TOTAL: usize=40;
    let server=Server {slots:Arc::new(Semaphore::new(workers)),queued:Arc::new(AtomicUsize::new(0)),active:Arc::new(AtomicUsize::new(0)),peak:Arc::new(AtomicUsize::new(0))};
    let app=Router::new().route("/",get(work)).with_state(server.clone());
    let listener=tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();let url=format!("http://{}/",listener.local_addr().unwrap());
    let serving=tokio::spawn(async move{axum::serve(listener,app).await.unwrap();});
    let client=reqwest::Client::new();let mut tasks=JoinSet::new();let mut results=Vec::new();let start=Instant::now();
    for _ in 0..TOTAL {
        if tasks.len()>=concurrency {results.push(tasks.join_next().await.unwrap().unwrap());}
        tasks.spawn(request(client.clone(),url.clone()));
    }
    while let Some(result)=tasks.join_next().await {results.push(result.unwrap());}
    let elapsed_us=start.elapsed().as_micros();let completed=results.iter().filter(|row|row.2=="ok").count();let timeouts=results.iter().filter(|row|row.2=="timeout").count();let transport=TOTAL-completed-timeouts;
    let mut latency=results.iter().filter(|row|row.2=="ok").map(|row|row.0).collect::<Vec<_>>();let mut queues=results.iter().filter_map(|row|row.1).collect::<Vec<_>>();
    let p50=percentile(&mut latency,50);let p95=percentile(&mut latency,95);let p99=percentile(&mut latency,99);let queue_p95=percentile(&mut queues,95);
    tokio::time::timeout(Duration::from_secs(3),async {while server.active.load(Ordering::SeqCst)!=0||server.queued.load(Ordering::SeqCst)!=0 {tokio::time::sleep(Duration::from_millis(1)).await;}}).await.unwrap();
    assert!(server.peak.load(Ordering::SeqCst)<=workers);assert_eq!(results.len(),TOTAL);
    println!("LOAD_SAMPLE {}",serde_json::json!({"suite":suite,"round":round,"workers":workers,"concurrency":concurrency,"requests":TOTAL,"completed":completed,"timeouts":timeouts,"transport_failures":transport,"elapsed_us":elapsed_us,"successful_per_second":completed as f64*1_000_000.0/elapsed_us as f64,"success_p50_us":p50,"success_p95_us":p95,"success_p99_us":p99,"success_queue_p95_us":queue_p95,"peak_active":server.peak.load(Ordering::SeqCst),"deadline_ms":80,"simulated_work_ms":20}));
    serving.abort();assert!(serving.await.unwrap_err().is_cancelled());
}
#[tokio::main(flavor="multi_thread",worker_threads=2)]
async fn main() {
    for round in 1..=2 {
        let order=if round==1 {vec![1,4,12]}else{vec![12,4,1]};
        for concurrency in order {sample("concurrency",round,2,concurrency).await;}
        let order=if round==1 {vec![(1,2),(1,8),(2,8),(2,2)]}else{vec![(2,2),(2,8),(1,8),(1,2)]};
        for (workers,concurrency) in order {sample("factorial",round,workers,concurrency).await;}
    }
}
