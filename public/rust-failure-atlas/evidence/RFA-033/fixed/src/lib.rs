#[cfg(test)]
mod tests {
    use std::sync::{mpsc, Mutex};

    static PROCESS_RESOURCE: Mutex<()> = Mutex::new(());

    #[test]
    fn a_joins_the_worker_which_uses_process_state() {
        let (ready_tx, ready_rx) = mpsc::channel();
        let worker = std::thread::spawn(move || {
            let _guard = PROCESS_RESOURCE.lock().unwrap();
            ready_tx.send(()).unwrap();
        });

        ready_rx.recv().unwrap();
        worker.join().unwrap();
    }

    #[test]
    fn b_can_acquire_the_released_process_resource() {
        let _guard = PROCESS_RESOURCE.lock().unwrap();
    }
}
