mod model {
    pub struct Config {
        pub name: &'static str,
        secret: u64,
    }

    impl Config {
        pub fn new(name: &'static str, secret: u64) -> Self {
            Self { name, secret }
        }

        pub fn has_secret(&self) -> bool { self.secret != 0 }
    }
}

fn main() {
    let config = model::Config::new("api", 7);
    assert_eq!(config.name, "api");
    assert!(config.has_secret());
}
