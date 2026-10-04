#[cfg(feature = "cli")]
fn main() {
    println!("{}", helper::message());
}

#[cfg(not(feature = "cli"))]
fn main() {
    println!("minimal build");
}
