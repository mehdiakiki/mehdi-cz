use sql_rust_postgres_sqlite::{pg::Fixture, Result};
use sqlx::{
    postgres::{PgConnectOptions, PgSslMode},
    Connection, PgConnection, PgPool,
};
use std::{str::FromStr, time::Duration};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    time::timeout,
};

// article:start apply
async fn apply(connection: &mut PgConnection, key: &str, amount: i32) -> Result<i32> {
    let mut tx = connection.begin().await?;
    let inserted = sqlx::query(
        "INSERT INTO operations (key, amount) VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING",
    )
    .bind(key)
    .bind(amount)
    .execute(&mut *tx)
    .await?
    .rows_affected();
    let recorded: i32 = sqlx::query_scalar("SELECT amount FROM operations WHERE key = $1")
        .bind(key)
        .fetch_one(&mut *tx)
        .await?;
    if recorded != amount {
        tx.rollback().await?;
        return Err("operation key was reused with a different amount".into());
    }
    if inserted == 1 {
        let changed = sqlx::query("UPDATE account SET balance = balance + $1 WHERE id = 1")
            .bind(amount)
            .execute(&mut *tx)
            .await?
            .rows_affected();
        if changed != 1 {
            tx.rollback().await?;
            return Err("account missing".into());
        }
    }
    tx.commit().await?;
    Ok(recorded)
}
// article:end apply

async fn lose_commit_reply(listener: TcpListener, options: PgConnectOptions) -> Result<()> {
    let (client, _) = listener.accept().await?;
    let server = TcpStream::connect((options.get_host(), options.get_port())).await?;
    let (mut client_in, mut client_out) = client.into_split();
    let (mut server_in, mut server_out) = server.into_split();
    let upstream = async {
        tokio::io::copy(&mut client_in, &mut server_out).await?;
        Err::<(), Box<dyn std::error::Error + Send + Sync>>(
            "client closed before COMMIT reply".into(),
        )
    };
    let downstream = async {
        loop {
            let tag = server_in.read_u8().await?;
            let length = server_in.read_u32().await?;
            if !(4..=1_048_576).contains(&length) {
                return Err("fixture frame outside bound".into());
            }
            let mut body = vec![0; length as usize - 4];
            server_in.read_exact(&mut body).await?;
            // article:start suppress
            if tag == b'C' && body == b"COMMIT\0" {
                // PostgreSQL emitted CommandComplete. The Rust caller never receives it.
                client_out.shutdown().await?;
                return Ok::<_, Box<dyn std::error::Error + Send + Sync>>(());
            }
            // article:end suppress
            client_out.write_u8(tag).await?;
            client_out.write_u32(length).await?;
            client_out.write_all(&body).await?;
        }
    };
    tokio::select! { result = upstream => result, result = downstream => result }
}

async fn state(pool: &PgPool) -> Result<(i32, i64)> {
    let balance = sqlx::query_scalar("SELECT balance FROM account WHERE id = 1")
        .fetch_one(pool)
        .await?;
    let count = sqlx::query_scalar("SELECT count(*) FROM operations")
        .fetch_one(pool)
        .await?;
    Ok((balance, count))
}
async fn check(fixture: &Fixture) -> Result<()> {
    sqlx::raw_sql(
        "CREATE TABLE account(id integer PRIMARY KEY, balance integer NOT NULL);
        INSERT INTO account VALUES (1, 0);
        CREATE TABLE operations(key text PRIMARY KEY, amount integer NOT NULL CHECK(amount > 0))",
    )
    .execute(&fixture.pool)
    .await?;
    let mut direct = fixture.pool.acquire().await?;
    // A known rejection before commit is a different test from a lost commit reply.
    assert!(apply(&mut direct, "bad", -1).await.is_err());
    assert_eq!(state(&fixture.pool).await?, (0, 0));
    // Force a session to end with uncommitted changes, then inspect from another connection.
    let mut interrupted = PgConnection::connect(&std::env::var("SQL_RUST_PG_URL")?).await?;
    sqlx::query(&format!("SET search_path TO {}", fixture.schema))
        .execute(&mut interrupted)
        .await?;
    let pid: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
        .fetch_one(&mut interrupted)
        .await?;
    sqlx::raw_sql("BEGIN; UPDATE account SET balance = 99 WHERE id = 1")
        .execute(&mut interrupted)
        .await?;
    assert!(
        sqlx::query_scalar::<_, bool>("SELECT pg_terminate_backend($1, 2000)")
            .bind(pid)
            .fetch_one(&fixture.pool)
            .await?
    );
    drop(interrupted);
    assert_eq!(state(&fixture.pool).await?, (0, 0));

    let url = std::env::var("SQL_RUST_PG_URL")?;
    let options = PgConnectOptions::from_str(&url)?.ssl_mode(PgSslMode::Disable);
    let listener = TcpListener::bind("127.0.0.1:0").await?;
    let port = listener.local_addr()?.port();
    let proxy_options = options.clone();
    let proxy = tokio::spawn(lose_commit_reply(listener, proxy_options));
    let mut client = PgConnection::connect_with(&options.host("127.0.0.1").port(port)).await?;
    sqlx::query(&format!("SET search_path TO {}", fixture.schema))
        .execute(&mut client)
        .await?;
    let error = apply(&mut client, "payment-17", 30).await.unwrap_err();
    proxy.await??;
    println!("Proxy consumed COMMIT CommandComplete; caller received error: {error}");
    assert_eq!(state(&fixture.pool).await?, (30, 1));
    assert_eq!(apply(&mut direct, "payment-17", 30).await?, 30);
    assert!(apply(&mut direct, "payment-17", 31).await.is_err());
    assert_eq!(state(&fixture.pool).await?, (30, 1));
    // An absent receipt is safe to retry only through the same key protocol.
    assert_eq!(apply(&mut direct, "payment-18", 5).await?, 5);
    assert_eq!(state(&fixture.pool).await?, (35, 2));
    println!("Known rejection and forced pre-commit termination left no writes; lost reply left one atomic receipt/effect; same-key replay did not repeat it; changed amount was rejected.");
    Ok(())
}
async fn run() -> Result<()> {
    let fixture = Fixture::new().await?;
    let result = check(&fixture).await;
    fixture.finish(result).await
}
#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    timeout(Duration::from_secs(25), run()).await?
}
#[tokio::test]
async fn integration() -> Result<()> {
    timeout(Duration::from_secs(25), run()).await?
}
