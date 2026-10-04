fn spawn_label(label: &str) {
    std::thread::spawn(|| println!("{label}"));
}

fn main() {
    spawn_label("atlas");
}
