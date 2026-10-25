use rusqlite::Connection;
use sql_rust_postgres_sqlite::{sqlite_version, Result};
use std::{path::PathBuf, thread, time::Duration};
use tokio::sync::{mpsc, oneshot};

#[derive(Debug)]
enum Job {
    Insert { entered: oneshot::Sender<()>, reply: oneshot::Sender<rusqlite::Result<usize>> },
    Count { reply: oneshot::Sender<rusqlite::Result<i64>> },
}

fn worker(path: PathBuf, mut jobs: mpsc::Receiver<Job>) -> thread::JoinHandle<Result<()>> {
    thread::spawn(move || {
        let connection = Connection::open(path)?;
        connection.busy_timeout(Duration::from_secs(2))?;
        while let Some(job) = jobs.blocking_recv() {
            match job {
                Job::Insert { entered, reply } => {
                    let _ = entered.send(());
                    let result = connection.execute("INSERT INTO notes (title) VALUES (?1)", ["queued note"]);
                    let _ = reply.send(result);
                }
                Job::Count { reply } => {
                    let _ = reply.send(connection.query_row("SELECT count(*) FROM notes", [], |r| r.get(0)));
                }
            }
        }
        Ok(())
    })
}

async fn run() -> Result<()> {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("notes.sqlite");
    let blocker = Connection::open(&path)?;
    sqlite_version(&blocker)?;
    blocker.execute_batch("CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT NOT NULL); BEGIN IMMEDIATE;")?;
    // article-example:start
    let (send, receive) = mpsc::channel(2);
    let database_thread = worker(path, receive);
    let (entered, started) = oneshot::channel();
    let (reply, saved) = oneshot::channel();
    send.send(Job::Insert { entered, reply }).await?;
    tokio::time::timeout(Duration::from_secs(1), started).await??;
    let heartbeat = tokio::spawn(async { "other Rust task ran" });
    assert_eq!(tokio::time::timeout(Duration::from_secs(1), heartbeat).await??,
               "other Rust task ran");
    // article-example:end
    let (first, first_result) = oneshot::channel();
    let (second, second_result) = oneshot::channel();
    send.try_send(Job::Count { reply: first }).map_err(|_| "first queue slot missing")?;
    send.try_send(Job::Count { reply: second }).map_err(|_| "second queue slot missing")?;
    let (extra, _) = oneshot::channel();
    assert!(matches!(send.try_send(Job::Count { reply: extra }), Err(mpsc::error::TrySendError::Full(_))));
    blocker.execute_batch("COMMIT")?;
    assert_eq!(tokio::time::timeout(Duration::from_secs(3), saved).await???, 1);
    assert_eq!(first_result.await??, 1);
    assert_eq!(second_result.await??, 1);
    drop(send);
    database_thread.join().map_err(|_| "database worker panicked")??;
    println!("Current-thread Tokio task progressed while SQLite write waited. Two queue slots filled; third rejected. Releasing lock saved one note.");
    Ok(())
}
#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> { tokio::time::timeout(Duration::from_secs(10), run()).await? }
#[tokio::test]
async fn contract() -> Result<()> { tokio::time::timeout(Duration::from_secs(10), run()).await? }
