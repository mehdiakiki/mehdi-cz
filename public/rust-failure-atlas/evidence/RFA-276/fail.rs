use std::fs::OpenOptions;

fn main() {
    let path = std::env::temp_dir().join(format!("rfa-276-{}.txt", std::process::id()));
    let _ = std::fs::remove_file(&path);

    OpenOptions::new()
        .read(true)
        .create(true)
        .open(&path)
        .expect("OpenOptions::create without write or append access fails with InvalidInput");
}
