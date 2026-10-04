fn main() {
    let text: &str = "atlas";
    let address = text as *const str as usize;
    println!("{address}");
}
