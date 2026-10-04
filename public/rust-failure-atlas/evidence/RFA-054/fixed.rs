fn label(id: u64) -> String {
    format!("item-{id}")
}

fn main() {
    assert_eq!(label(7), "item-7");
}
