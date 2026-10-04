// Article 3: a type with zero members. A match with zero arms is complete.
#[allow(dead_code)]
enum Void {}

fn unreachable_value(v: Void) -> u8 {
    match v {}
}

fn parse(text: &str) -> Result<u8, Void> {
    Ok(text.len() as u8)
}

fn parse_std(text: &str) -> Result<u8, std::convert::Infallible> {
    Ok(text.len() as u8)
}

fn main() {
    let Ok(n) = parse("four");
    println!("parsed {n}, and the Err arm was not needed");
    let Ok(m) = parse_std("three");
    println!("parsed {m} with Infallible, same thing");
    println!("size of Result<u8, Infallible>: {}", std::mem::size_of::<Result<u8, std::convert::Infallible>>());
    let _ = unreachable_value;
}
