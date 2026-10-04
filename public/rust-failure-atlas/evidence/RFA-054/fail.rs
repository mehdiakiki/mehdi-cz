fn label(id: u64) -> &'static str {
    let rendered = format!("item-{id}");
    rendered.as_str()
}

fn main() {
    println!("{}", label(7));
}
