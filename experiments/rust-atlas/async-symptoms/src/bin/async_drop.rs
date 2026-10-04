use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;

static CLEANUPS_DONE: AtomicUsize = AtomicUsize::new(0);
static CLEANUPS_STARTED: AtomicUsize = AtomicUsize::new(0);

async fn release_lease(id: u32) {
    CLEANUPS_STARTED.fetch_add(1, Ordering::SeqCst); // -> first poll reached
    tokio::time::sleep(Duration::from_millis(20)).await;
    CLEANUPS_DONE.fetch_add(1, Ordering::SeqCst);
    let _ = id;
}

// Attempt 1: block on the async cleanup inside Drop.
struct BlockingLease(u32);
impl Drop for BlockingLease {
    fn drop(&mut self) {
        let id = self.0;
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            tokio::runtime::Handle::current().block_on(release_lease(id));
        }));
        if let Err(e) = result {
            let msg = e.downcast_ref::<String>().cloned()
                .or_else(|| e.downcast_ref::<&str>().map(|s| s.to_string()))
                .unwrap_or_default();
            println!("attempt 1, block_on inside Drop: panicked: {}", msg.lines().next().unwrap_or(""));
        }
    }
}

// Attempt 2: spawn the cleanup from Drop.
struct SpawningLease(u32);
impl Drop for SpawningLease {
    fn drop(&mut self) {
        let id = self.0;
        tokio::spawn(release_lease(id));
    }
}

// Attempt 3: explicit async close, Drop only reports what was forgotten.
struct ExplicitLease { id: u32, closed: bool, forgotten: Arc<AtomicUsize> }
impl ExplicitLease {
    async fn close(mut self) {
        release_lease(self.id).await;
        self.closed = true;
    }
}
impl Drop for ExplicitLease {
    fn drop(&mut self) {
        if !self.closed { self.forgotten.fetch_add(1, Ordering::SeqCst); }
    }
}

// Attempt 4: Drop hands the id to a long-lived cleanup task through a channel.
struct QueuedLease { id: u32, tx: mpsc::UnboundedSender<u32> }
impl Drop for QueuedLease {
    fn drop(&mut self) { let _ = self.tx.send(self.id); }
}

fn main() {
    let rt = tokio::runtime::Builder::new_multi_thread().worker_threads(2).enable_all().build().unwrap();

    rt.block_on(async {
        drop(BlockingLease(1));

        CLEANUPS_DONE.store(0, Ordering::SeqCst);
        drop(SpawningLease(2));
        tokio::time::sleep(Duration::from_millis(60)).await;
        println!("attempt 2, spawn inside Drop, runtime alive: cleanups done = {}", CLEANUPS_DONE.load(Ordering::SeqCst));
    });

    // Attempt 2 again, but the value is dropped while the runtime shuts down.
    CLEANUPS_DONE.store(0, Ordering::SeqCst);
    CLEANUPS_STARTED.store(0, Ordering::SeqCst);
    let rt2 = tokio::runtime::Builder::new_multi_thread().worker_threads(2).enable_all().build().unwrap();
    rt2.spawn(async {
        let _lease = SpawningLease(3);
        tokio::time::sleep(Duration::from_secs(10)).await;
    });
    std::thread::sleep(Duration::from_millis(50));
    drop(rt2);
    std::thread::sleep(Duration::from_millis(60));
    println!("attempt 2, spawn inside Drop, runtime shutting down: cleanups started = {}, done = {}",
        CLEANUPS_STARTED.load(Ordering::SeqCst), CLEANUPS_DONE.load(Ordering::SeqCst));

    rt.block_on(async {
        CLEANUPS_DONE.store(0, Ordering::SeqCst);
        let forgotten = Arc::new(AtomicUsize::new(0));
        let a = ExplicitLease { id: 4, closed: false, forgotten: forgotten.clone() };
        let b = ExplicitLease { id: 5, closed: false, forgotten: forgotten.clone() };
        a.close().await;
        drop(b);
        println!("attempt 3, explicit close: cleanups done = {}, forgotten leases = {}",
            CLEANUPS_DONE.load(Ordering::SeqCst), forgotten.load(Ordering::SeqCst));

        CLEANUPS_DONE.store(0, Ordering::SeqCst);
        let (tx, mut rx) = mpsc::unbounded_channel();
        let cleaner = tokio::spawn(async move {
            while let Some(id) = rx.recv().await { release_lease(id).await; }
        });
        for id in 6..9 { drop(QueuedLease { id, tx: tx.clone() }); }
        drop(tx);
        cleaner.await.unwrap();
        println!("attempt 4, Drop sends to a cleanup task, awaited at shutdown: cleanups done = {}",
            CLEANUPS_DONE.load(Ordering::SeqCst));
    });
}
