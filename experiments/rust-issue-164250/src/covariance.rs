fn main() {
    let mut value = Some("static text");
    let local = String::from("local text");
    value = Some(local.as_str());
    println!("{:?}", value);
}
