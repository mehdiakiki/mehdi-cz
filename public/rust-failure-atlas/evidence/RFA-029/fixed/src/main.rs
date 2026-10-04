use std::sync::{
    atomic::{AtomicBool, Ordering},
    mpsc,
    Arc,
};
use std::time::Duration as WallDuration;

use tokio::time::{self, Duration, Instant};

fn main() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_time()
        .build()
        .unwrap();

    runtime.block_on(async {
        time::pause();
        let virtual_start = Instant::now();
        let stop = Arc::new(AtomicBool::new(false));
        let worker_stop = Arc::clone(&stop);
        let (started_tx, started_rx) = mpsc::channel();

        let worker = tokio::task::spawn_blocking(move || {
            started_tx.send(()).unwrap();
            while !worker_stop.load(Ordering::Acquire) {
                std::thread::park_timeout(WallDuration::from_millis(5));
            }
        });

        started_rx.recv().unwrap();
        stop.store(true, Ordering::Release);
        worker.await.unwrap();

        let timer = tokio::spawn(async {
            time::sleep(Duration::from_secs(3_600)).await;
        });
        tokio::task::yield_now().await;

        // Once blocking work is finished, the test can drive virtual time explicitly.
        time::advance(Duration::from_secs(3_600)).await;
        timer.await.unwrap();
        assert!(virtual_start.elapsed() >= Duration::from_secs(3_600));
        eprintln!("blocking worker stopped; explicit advance completed");
    });
}
