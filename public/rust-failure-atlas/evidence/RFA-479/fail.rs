mod model {
    pub struct Config {
        pub name: &'static str,
        secret: u64,
    }
}

fn main() {
    let _config = model::Config { name: "api", secret: 7 };
}
