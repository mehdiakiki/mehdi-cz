fn main() {
    let mut endpoint = String::from("primary");

    {
        let selected = endpoint.as_str();
        println!("selected: {selected}");
    }

    endpoint = String::from("fallback");
    assert_eq!(endpoint, "fallback");
}
