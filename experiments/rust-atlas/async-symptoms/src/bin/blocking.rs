use std::time::{Duration, Instant};
use tokio::time::{interval, sleep};

async fn worst_tick_delay(label: &str, run_blocking: impl FnOnce() + Send + 'static, use_spawn_blocking: bool) {
    let mut ticker = interval(Duration::from_millis(10));
    ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    let ticks = tokio::spawn(async move {
        let mut worst = Duration::ZERO;
        let mut last = Instant::now();
        ticker.tick().await;
        for _ in 0..80 {
            ticker.tick().await;
            let now = Instant::now();
            let gap = now - last;
            if gap > worst { worst = gap; }
            last = now;
        }
        worst
    });
    sleep(Duration::from_millis(200)).await;
    if use_spawn_blocking {
        tokio::task::spawn_blocking(run_blocking).await.unwrap();
    } else {
        tokio::spawn(async move { run_blocking(); }).await.unwrap();
    }
    let worst = ticks.await.unwrap();
    println!("{label:<34} worst gap between 10ms ticks: {:?}", worst);
}

fn main() {
    let rt = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(1)
        .enable_all()
        .build()
        .unwrap();
    rt.block_on(async {
        worst_tick_delay("no blocking work", || {}, false).await;
        worst_tick_delay("300ms thread::sleep in tokio::spawn", || std::thread::sleep(Duration::from_millis(300)), false).await;
        worst_tick_delay("300ms thread::sleep in spawn_blocking", || std::thread::sleep(Duration::from_millis(300)), true).await;
    });
}
