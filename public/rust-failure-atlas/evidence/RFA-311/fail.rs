fn main() {
    let mut values = 1..=4;
    let folded: Result<i32, &'static str> = values.try_fold(0, |sum, value| {
        if value == 3 {
            Err("three is rejected")
        } else {
            Ok(sum + value)
        }
    });

    assert_eq!(folded, Err("three is rejected"));
    assert_eq!(
        values.next(),
        Some(3),
        "try_fold consumes the item that makes its closure short-circuit and leaves later items in the iterator"
    );
}
