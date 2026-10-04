fn spawn_label(label: &str) -> std::thread::JoinHandle<()> {
    let owned = label.to_owned();
    std::thread::spawn(move || println!("{owned}"))
}

fn main() {
    spawn_label("atlas").join().unwrap();
}
