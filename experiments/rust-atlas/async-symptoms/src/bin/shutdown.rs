use std::time::{Duration, Instant};

fn runtime() -> tokio::runtime::Runtime {
    tokio::runtime::Builder::new_multi_thread().worker_threads(2).enable_all().build().unwrap()
}

fn main() {
    let rt = runtime();
    rt.spawn(async { loop { tokio::time::sleep(Duration::from_millis(50)).await; } });
    std::thread::sleep(Duration::from_millis(100));
    let t = Instant::now();
    drop(rt);
    println!("async loop task, drop(runtime):              {:?}", t.elapsed());

    let rt = runtime();
    rt.spawn_blocking(|| std::thread::sleep(Duration::from_secs(3)));
    std::thread::sleep(Duration::from_millis(100));
    let t = Instant::now();
    drop(rt);
    println!("3s spawn_blocking task, drop(runtime):       {:?}", t.elapsed());

    let rt = runtime();
    rt.spawn_blocking(|| std::thread::sleep(Duration::from_secs(3)));
    std::thread::sleep(Duration::from_millis(100));
    let t = Instant::now();
    rt.shutdown_timeout(Duration::from_millis(500));
    println!("3s spawn_blocking task, shutdown_timeout(500ms): {:?}", t.elapsed());
}
