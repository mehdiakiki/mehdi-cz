use rfa_traced_macros::traced;

#[traced]
fn main() {
    println!("expanded in the consumer crate");
}
