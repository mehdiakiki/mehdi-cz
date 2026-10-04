fn endpoint(production: bool) -> &'static str {
    let address: &'static str;

    if production {
        address = "https://api.example.com";
    }

    address
}

fn main() {
    println!("{}", endpoint(false));
}
