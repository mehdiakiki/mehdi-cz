fn main() {
    let source = [Ok(1), Err("bad record"), Ok(3)];
    let mut values = Vec::new();
    let mut errors = Vec::new();

    for item in source {
        match item {
            Ok(value) => values.push(value),
            Err(error) => errors.push(error),
        }
    }

    assert_eq!(values, [1, 3]);
    assert_eq!(errors, ["bad record"]);
}
