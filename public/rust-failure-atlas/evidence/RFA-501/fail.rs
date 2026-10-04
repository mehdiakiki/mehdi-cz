fn schedule(task: &str, retries: u8) -> String {
    format!("{task}:{retries}")
}

fn main() {
    let _job = schedule("index");
}
