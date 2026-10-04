fn main() {
    let frame = [0xAA_u8, 0xBB, 0xCC];
    let body = frame.strip_circumfix(&[0xAA, 0xBB], &[0xBB, 0xCC]).unwrap();
    println!("{body:?}");
}
