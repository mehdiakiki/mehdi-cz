use std::collections::HashMap;

fn get_or_insert<'a>(
    values: &'a mut HashMap<String, String>,
    key: &str,
) -> &'a mut String {
    values.entry(key.to_owned()).or_default()
}

fn main() {
    let mut values = HashMap::new();
    get_or_insert(&mut values, "region").push_str("eu");
    assert_eq!(values["region"], "eu");
}
