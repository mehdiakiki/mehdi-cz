fn identity(value: &String) -> &str {
    value.as_str()
}

fn main() {
    let selected = identity(&String::from("ready"));
    println!("{selected}");
}
