fn main() {
    let local = 0u8;
    let boxed = Box::new(1u8);
    println!("main {:p}, local {:p}, boxed {:p}", main as fn(), &local, boxed);
    print!("{}", std::fs::read_to_string("/proc/self/maps").unwrap());
}
