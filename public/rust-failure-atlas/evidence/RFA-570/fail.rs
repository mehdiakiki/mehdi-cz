fn main() {
    let mut attempts = 0;

    while {
        attempts += 1;
        break
    } {}

    println!("{attempts}");
}
