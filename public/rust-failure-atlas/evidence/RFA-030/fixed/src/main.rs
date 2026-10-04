use std::sync::{mpsc, Arc, Condvar, Mutex};

fn main() {
    let release = Arc::new((Mutex::new(false), Condvar::new()));
    let worker_release = Arc::clone(&release);
    let (started_tx, started_rx) = mpsc::channel();
    let runtime = tokio::runtime::Builder::new_current_thread()
        .build()
        .unwrap();

    runtime.block_on(async move {
        let worker = tokio::task::spawn_blocking(move || {
            started_tx.send(()).unwrap();
            let (lock, wake) = &*worker_release;
            let stopped = lock.lock().unwrap();
            drop(wake.wait_while(stopped, |stop| !*stop).unwrap());
        });
        started_rx.recv().unwrap();

        let (lock, wake) = &*release;
        *lock.lock().unwrap() = true;
        wake.notify_one();
        worker.await.unwrap();
        eprintln!("blocking worker acknowledged shutdown");
    });

    drop(runtime);
    eprintln!("runtime dropped after blocking worker finished");
}
