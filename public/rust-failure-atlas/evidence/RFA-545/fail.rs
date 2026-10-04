fn main() {
    let mut endpoint = String::from("primary");
    let selected = endpoint.as_str();

    endpoint = String::from("fallback");
    println!("selected: {selected}, current: {endpoint}");
}
