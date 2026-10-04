fn schedule(task: &str, retries: u8) -> String {
    format!("{task}:{retries}")
}

fn main() {
    assert_eq!(schedule("index", 3), "index:3");
}
