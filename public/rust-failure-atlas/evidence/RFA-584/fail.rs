mod account {
    pub struct Balance {
        cents: i64,
    }

    impl Balance {
        pub fn new(cents: i64) -> Self {
            Self { cents }
        }
    }
}

fn main() {
    let balance = account::Balance::new(750);
    println!("{}", balance.cents);
}
