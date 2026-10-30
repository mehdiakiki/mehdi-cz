use sql_rust_postgres_sqlite::{pg::Fixture, Result};
use sqlx::PgPool;
use std::{
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::Duration,
};
use tokio::{
    sync::{mpsc, OwnedSemaphorePermit, Semaphore},
    time::timeout,
};

const ROW_BYTES: usize = 8192;
const PRODUCERS: usize = 4;

struct Batch {
    payload: String,
    retained: Arc<AtomicUsize>,
    _budget: Option<OwnedSemaphorePermit>,
}
impl Batch {
    fn new(
        payload: String,
        retained: Arc<AtomicUsize>,
        budget: Option<OwnedSemaphorePermit>,
    ) -> Self {
        assert_eq!(payload.len(), ROW_BYTES);
        retained.fetch_add(payload.len(), Ordering::SeqCst);
        Self {
            payload,
            retained,
            _budget: budget,
        }
    }
}
impl Drop for Batch {
    fn drop(&mut self) {
        self.retained
            .fetch_sub(self.payload.len(), Ordering::SeqCst);
    }
}

// article:start budgeted-producer
async fn load_with_budget(
    pool: &PgPool,
    bytes: Arc<Semaphore>,
    output: &mpsc::Sender<Batch>,
    retained: Arc<AtomicUsize>,
) -> Result<()> {
    let permit = bytes.acquire_many_owned(ROW_BYTES as u32).await?;
    let payload: String = sqlx::query_scalar("SELECT repeat('x', 8192)")
        .fetch_one(pool)
        .await?;
    let batch = Batch::new(payload, retained, Some(permit));
    output.send(batch).await.map_err(|_| "consumer stopped")?;
    Ok(())
}
// article:end budgeted-producer

async fn wait_for_bytes(retained: &AtomicUsize, expected: usize) -> Result<()> {
    timeout(Duration::from_secs(3), async {
        while retained.load(Ordering::SeqCst) != expected {
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await?;
    Ok(())
}

async fn check(pool: &PgPool) -> Result<()> {
    let (output, mut input) = mpsc::channel::<Batch>(1);
    let retained = Arc::new(AtomicUsize::new(0));
    let mut tasks = Vec::new();
    for _ in 0..PRODUCERS {
        let pool = pool.clone();
        let output = output.clone();
        let retained = retained.clone();
        tasks.push(tokio::spawn(async move {
            let payload: String = sqlx::query_scalar("SELECT repeat('x', 8192)")
                .fetch_one(&pool)
                .await?;
            output
                .send(Batch::new(payload, retained, None))
                .await
                .map_err(|_| "consumer stopped")?;
            Ok::<_, Box<dyn std::error::Error + Send + Sync>>(())
        }));
    }
    wait_for_bytes(&retained, ROW_BYTES * PRODUCERS).await?;
    assert_eq!(input.len(), 1);
    println!("Queue capacity=1; four database producers retained 32768 payload bytes: one queued row plus three blocked sends.");
    for _ in 0..PRODUCERS {
        drop(input.recv().await.ok_or("missing row")?);
    }
    for task in tasks {
        task.await??;
    }
    assert_eq!(retained.load(Ordering::SeqCst), 0);

    for cancel in [false, true] {
        let budget = Arc::new(Semaphore::new(ROW_BYTES * 2));
        let retained = Arc::new(AtomicUsize::new(0));
        let (output, mut input) = mpsc::channel::<Batch>(1);
        let mut tasks = Vec::new();
        for _ in 0..PRODUCERS {
            let pool = pool.clone();
            let budget = budget.clone();
            let output = output.clone();
            let retained = retained.clone();
            tasks.push(tokio::spawn(async move {
                load_with_budget(&pool, budget, &output, retained).await
            }));
        }
        wait_for_bytes(&retained, ROW_BYTES * 2).await?;
        assert_eq!(input.len(), 1);
        assert_eq!(budget.available_permits(), 0);
        if cancel {
            for task in &tasks {
                task.abort();
            }
            for task in tasks {
                match task.await {
                    Ok(result) => result?,
                    Err(error) => assert!(error.is_cancelled()),
                }
            }
            drop(input);
        } else {
            for _ in 0..PRODUCERS {
                drop(input.recv().await.ok_or("missing row")?);
            }
            for task in tasks {
                task.await??;
            }
        }
        assert_eq!(retained.load(Ordering::SeqCst), 0);
        assert_eq!(budget.available_permits(), ROW_BYTES * 2);
        println!("cancel={cancel}: byte admission limited retained application payload to 16384 bytes before draining; all payload and permits were released. This is logical payload accounting, not RSS.");
    }
    let budget = Arc::new(Semaphore::new(ROW_BYTES * 2));
    let retained = Arc::new(AtomicUsize::new(0));
    let (output, input) = mpsc::channel::<Batch>(1);
    drop(input);
    assert!(load_with_budget(pool, budget.clone(), &output, retained.clone()).await.is_err());
    assert_eq!(retained.load(Ordering::SeqCst), 0);
    assert_eq!(budget.available_permits(), ROW_BYTES * 2);
    println!("Closed consumer: failed send returns its payload and all byte permits.");
    Ok(())
}
async fn run() -> Result<()> {
    let fixture = Fixture::new().await?;
    let result = check(&fixture.pool).await;
    fixture.finish(result).await
}
#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    timeout(Duration::from_secs(20), run()).await?
}
#[tokio::test]
async fn integration() -> Result<()> {
    timeout(Duration::from_secs(20), run()).await?
}
