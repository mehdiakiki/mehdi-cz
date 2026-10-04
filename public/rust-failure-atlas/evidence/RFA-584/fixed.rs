mod account {
    pub struct Balance {
        cents: i64,
    }

    impl Balance {
        pub fn new(cents: i64) -> Self {
            Self { cents }
        }

        pub fn cents(&self) -> i64 {
            self.cents
        }
    }
}

fn main() {
    let balance = account::Balance::new(750);
    assert_eq!(balance.cents(), 750);
}
