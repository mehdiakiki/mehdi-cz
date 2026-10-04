use std::sync::mpsc;
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
        let (started_tx, started_rx) = mpsc::channel();

        tokio::task::spawn_blocking(move || {
            started_tx.send(()).unwrap();
            loop {
                std::thread::park_timeout(WallDuration::from_secs(60));
            }
        });

        started_rx.recv().unwrap();
        eprintln!("blocking task started; virtual elapsed=0s");

        // This virtual hour cannot auto-advance while the blocking task is active.
        time::sleep(Duration::from_secs(3_600)).await;
        eprintln!("unexpected virtual elapsed={:?}", virtual_start.elapsed());
    });
}
