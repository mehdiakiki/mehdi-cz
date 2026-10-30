use std::{
    io::{BufRead, BufReader, Write},
    process::{Command, Stdio},
    time::Duration,
};

struct Child(std::process::Child);
impl Drop for Child {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

fn exercise(release: bool) {
    let child = Command::new(env!("CARGO_BIN_EXE_draining_api"))
        .env("SHUTDOWN_GRACE_MS", if release { "2000" } else { "200" })
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .unwrap();
    let mut child = Child(child);
    let mut output = BufReader::new(child.0.stdout.take().unwrap());
    let mut line = String::new();
    output.read_line(&mut line).unwrap();
    let port: u16 = line.trim().strip_prefix("port=").unwrap().parse().unwrap();
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(4))
        .build()
        .unwrap();
    assert_eq!(
        client
            .get(format!("http://127.0.0.1:{port}/ready"))
            .send()
            .unwrap()
            .status(),
        200
    );
    let request =
        std::thread::spawn(move || client.get(format!("http://127.0.0.1:{port}/work")).send());
    line.clear();
    output.read_line(&mut line).unwrap();
    assert_eq!(line.trim(), "working");
    assert!(Command::new("kill")
        .args(["-TERM", &child.0.id().to_string()])
        .status()
        .unwrap()
        .success());
    line.clear();
    output.read_line(&mut line).unwrap();
    assert_eq!(line.trim(), "draining");
    if release {
        child
            .0
            .stdin
            .as_mut()
            .unwrap()
            .write_all(b"finish\n")
            .unwrap();
    }
    line.clear();
    output.read_line(&mut line).unwrap();
    assert_eq!(line.trim(), if release { "stopped" } else { "deadline" });
    let status = child.0.wait().unwrap();
    assert_eq!(status.success(), release);
    let response = request.join().unwrap();
    if release {
        let response = response.unwrap();
        assert_eq!(response.status(), 200);
        assert_eq!(response.text().unwrap(), "completed");
    } else {
        assert!(response.is_err());
    }
    println!(
        "SIGTERM release={release}: {}",
        if release {
            "response=200 exit=0"
        } else {
            "request interrupted exit=nonzero"
        }
    );
}

#[test]
fn sigterm_allows_an_inflight_request_to_finish() {
    exercise(true);
}
#[test]
fn an_unfinished_request_hits_the_shutdown_deadline() {
    exercise(false);
}
