#[derive(Debug, PartialEq)]
struct Rejected {
    value: i32,
    partial_sum: i32,
}

fn main() {
    let mut values = 1..=4;
    let folded: Result<i32, Rejected> = values.try_fold(0, |sum, value| {
        if value == 3 {
            Err(Rejected {
                value,
                partial_sum: sum,
            })
        } else {
            Ok(sum + value)
        }
    });

    assert_eq!(folded, Err(Rejected { value: 3, partial_sum: 3 }));
    assert_eq!(values.next(), Some(4));
}
