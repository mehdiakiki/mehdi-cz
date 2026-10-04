fn main() {
    let variables: Vec<_> = std::env::vars_os().collect();
    let worker = std::thread::spawn(move || variables.len());
    println!("{}", worker.join().unwrap());
}
