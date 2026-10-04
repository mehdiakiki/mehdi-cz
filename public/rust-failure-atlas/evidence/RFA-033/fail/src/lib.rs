#[cfg(test)]
mod tests {
    use std::sync::{mpsc, Mutex};

    static PROCESS_RESOURCE: Mutex<()> = Mutex::new(());

    #[test]
    fn a_starts_a_worker_which_keeps_process_state() {
        let (ready_tx, ready_rx) = mpsc::channel();

        // Dropping a JoinHandle detaches the worker; it does not stop or join it.
        let _detached = std::thread::spawn(move || {
            let _guard = PROCESS_RESOURCE.lock().unwrap();
            ready_tx.send(()).unwrap();
            loop {
                std::thread::park();
            }
        });

        ready_rx.recv().unwrap();
    }

    #[test]
    fn b_waits_for_the_same_process_resource() {
        // This passes in a fresh test process but waits forever after test a.
        let _guard = PROCESS_RESOURCE.lock().unwrap();
    }
}
