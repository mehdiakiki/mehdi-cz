static LIMIT: u8 = 10;

fn main() {
    match 7_u8 {
        LIMIT => println!("matched {LIMIT}"),
    }
}
