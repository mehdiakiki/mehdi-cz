static mut REQUESTS: u64 = 0;

fn main() {
    let requests = unsafe { &REQUESTS };
    println!("{requests}");
}
