struct Config {
    enabled: bool,
}

fn main() {
    let config = Config();
    println!("{}", config.enabled);
}
