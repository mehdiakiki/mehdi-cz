fn main() {
    let variables = std::env::vars();
    let worker = std::thread::spawn(move || variables.count());
    println!("{}", worker.join().unwrap());
}
