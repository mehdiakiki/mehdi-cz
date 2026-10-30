use axum::{extract::State, http::StatusCode, routing::get, Router};
use std::{
    io::{BufRead, Write},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Duration,
};
use tokio::sync::{watch, Notify};

#[derive(Clone)]
struct App {
    ready: Arc<AtomicBool>,
    release: Arc<Notify>,
}

fn announce(message: &str) {
    println!("{message}");
    std::io::stdout().flush().unwrap();
}

async fn ready(State(state): State<App>) -> StatusCode {
    if state.ready.load(Ordering::SeqCst) {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    }
}

async fn work(State(state): State<App>) -> &'static str {
    announce("working");
    state.release.notified().await;
    "completed"
}

#[tokio::main(worker_threads = 2)]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let release = Arc::new(Notify::new());
    let from_stdin = release.clone();
    // Only a fixture control. A real handler waits for its real operation.
    std::thread::spawn(move || {
        let mut line = String::new();
        if std::io::stdin().lock().read_line(&mut line).is_ok() && line.trim() == "finish" {
            from_stdin.notify_one();
        }
    });
    let state = App {
        ready: Arc::new(AtomicBool::new(true)),
        release,
    };
    let app = Router::new()
        .route("/ready", get(ready))
        .route("/work", get(work))
        .with_state(state.clone());
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
    let port = listener.local_addr()?.port();
    // Register before announcing readiness so the test cannot race signal setup.
    let mut term = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())?;
    let (stop, mut stopped) = watch::channel(false);
    let mut server = tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async move {
                let _ = stopped.changed().await;
            })
            .await
    });
    announce(&format!("port={port}"));
    term.recv().await;
    // article:start shutdown
    state.ready.store(false, Ordering::SeqCst);
    stop.send(true)?;
    announce("draining");
    let grace = std::env::var("SHUTDOWN_GRACE_MS")
        .unwrap_or_else(|_| "2000".into())
        .parse()?;
    match tokio::time::timeout(Duration::from_millis(grace), &mut server).await {
        Ok(result) => {
            result??;
            announce("stopped");
        }
        Err(_) => {
            server.abort();
            announce("deadline");
            return Err("shutdown deadline reached".into());
        }
    }
    // article:end shutdown
    Ok(())
}
