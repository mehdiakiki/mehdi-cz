use std::collections::HashMap;

fn get_or_insert<'a>(
    values: &'a mut HashMap<String, String>,
    key: &str,
) -> &'a mut String {
    if let Some(value) = values.get_mut(key) {
        return value;
    }

    values.insert(key.to_owned(), String::new());
    values.get_mut(key).unwrap()
}

fn main() {
    let mut values = HashMap::new();
    get_or_insert(&mut values, "region").push_str("eu");
}
