use rust_backend_labs::{database, discard};
use std::{collections::HashSet, sync::Arc, time::Duration};
use tokio::sync::{oneshot, Mutex};

#[derive(Debug, PartialEq)]
struct Contact {
    email: String,
}

fn import_contacts(input: &[&str]) -> Result<Vec<Contact>, &'static str> {
    let mut seen = HashSet::new();
    let mut output = Vec::new();
    for raw in input {
        let email = raw.trim().to_ascii_lowercase();
        if email.is_empty() || !email.contains('@') {
            return Err("invalid fixture identity");
        }
        if seen.insert(email.clone()) {
            output.push(Contact { email });
        }
    }
    Ok(output)
}

fn contract(contacts: &[Contact]) {
    assert_eq!(contacts.len(), 1);
    assert_eq!(contacts[0].email, "alice@example.test");
}

#[test]
fn a_synthetic_regression_fails_for_the_old_variant_and_preserves_neighbours() {
    let input = [" Alice@Example.test ", "alice@example.test"];
    let old: Vec<Contact> = input
        .iter()
        .map(|value| Contact {
            email: value.to_string(),
        })
        .collect();
    assert!(std::panic::catch_unwind(|| contract(&old)).is_err());
    contract(&import_contacts(&input).unwrap());
    assert_eq!(
        import_contacts(&["alice@example.test", "bob@example.test"])
            .unwrap()
            .len(),
        2
    );
    assert_eq!(import_contacts(&["alice@example.test"]).unwrap().len(), 1);
    assert_eq!(
        import_contacts(&["no-at-sign"]).unwrap_err(),
        "invalid fixture identity"
    );
    println!("REGRESSION: retained synthetic input breaks the intended assertion for old variant; normalized variant passes; distinct identity and invalid input remain distinct outcomes");
}

fn intended_constraint(error: &sqlx::Error) -> bool {
    error
        .as_database_error()
        .and_then(|error| error.code())
        .as_deref()
        == Some("23514")
}

#[tokio::test]
async fn a_negative_database_check_requires_the_intended_constraint_and_stored_state() {
    let pool = database("practical_negative_contract").await;
    sqlx::query(
        "CREATE TABLE protected (id integer PRIMARY KEY, quantity integer CHECK (quantity >= 0))",
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query("INSERT INTO protected VALUES (1,7)")
        .execute(&pool)
        .await
        .unwrap();
    let error = sqlx::query("UPDATE protected SET quantity=-1 WHERE id=1")
        .execute(&pool)
        .await
        .unwrap_err();
    assert!(intended_constraint(&error));
    assert!(!intended_constraint(&sqlx::Error::PoolClosed));
    let stored: i32 = sqlx::query_scalar("SELECT quantity FROM protected WHERE id=1")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(stored, 7);
    sqlx::query("CREATE TABLE unprotected (quantity integer)")
        .execute(&pool)
        .await
        .unwrap();
    let accepted = sqlx::query("INSERT INTO unprotected VALUES (-1)")
        .execute(&pool)
        .await;
    assert!(accepted.is_ok());
    println!("NEGATIVE_TEST: valid control=7; rejected update=23514 and stored=7; PoolClosed is not accepted as a constraint result; missing protection permits -1 and fails the rejection contract");
    discard(pool, "practical_negative_contract").await;
}

#[derive(Debug, PartialEq)]
enum FetchError {
    Deadline,
    MissingResponse,
}
#[derive(Clone)]
enum Reply {
    RetryAfter(Duration),
    Success,
}
struct ScriptedTransport {
    replies: Mutex<std::collections::VecDeque<Reply>>,
    calls: Mutex<Vec<tokio::time::Instant>>,
}
impl ScriptedTransport {
    fn new(replies: Vec<Reply>) -> Self {
        Self {
            replies: Mutex::new(replies.into()),
            calls: Mutex::new(Vec::new()),
        }
    }
    async fn call(&self) -> Result<Reply, FetchError> {
        self.calls.lock().await.push(tokio::time::Instant::now());
        self.replies
            .lock()
            .await
            .pop_front()
            .ok_or(FetchError::MissingResponse)
    }
}

async fn fetch_with_retry(
    transport: &ScriptedTransport,
    budget: Duration,
) -> Result<(), FetchError> {
    let deadline = tokio::time::Instant::now() + budget;
    for _ in 0..2 {
        if tokio::time::Instant::now() >= deadline {
            return Err(FetchError::Deadline);
        }
        match transport.call().await? {
            Reply::Success => return Ok(()),
            Reply::RetryAfter(delay) => {
                if delay >= deadline.saturating_duration_since(tokio::time::Instant::now()) {
                    return Err(FetchError::Deadline);
                }
                tokio::time::sleep(delay).await;
            }
        }
    }
    Err(FetchError::Deadline)
}

#[tokio::test(start_paused = true)]
async fn retry_policy_uses_the_tokio_clock_and_a_readiness_signal_has_a_watchdog() {
    let long = ScriptedTransport::new(vec![Reply::RetryAfter(Duration::from_secs(30))]);
    assert_eq!(
        fetch_with_retry(&long, Duration::from_secs(5)).await,
        Err(FetchError::Deadline)
    );
    assert_eq!(long.calls.lock().await.len(), 1);
    let allowed = ScriptedTransport::new(vec![
        Reply::RetryAfter(Duration::from_secs(2)),
        Reply::Success,
    ]);
    assert_eq!(
        fetch_with_retry(&allowed, Duration::from_secs(5)).await,
        Ok(())
    );
    let times = allowed.calls.lock().await;
    assert_eq!(times.len(), 2);
    assert_eq!(times[1] - times[0], Duration::from_secs(2));
    drop(times);
    let (started, observed) = oneshot::channel();
    let (release, wait) = oneshot::channel();
    let value = Arc::new(Mutex::new(0));
    let worker_value = value.clone();
    let worker = tokio::spawn(async move {
        started.send(()).unwrap();
        wait.await.unwrap();
        *worker_value.lock().await = 42;
    });
    tokio::time::timeout(Duration::from_secs(5), observed)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(*value.lock().await, 0);
    release.send(()).unwrap();
    worker.await.unwrap();
    assert_eq!(*value.lock().await, 42);
    let (_never_sends, missing) = oneshot::channel::<()>();
    assert!(tokio::time::timeout(Duration::from_secs(5), missing)
        .await
        .is_err());
    println!("SIGNALS: readiness precedes release and stored=42; missing signal hits watchdog; Retry-After 30 exceeds five-second budget with one attempt; allowed retry occurs at virtual +2 seconds");
}
