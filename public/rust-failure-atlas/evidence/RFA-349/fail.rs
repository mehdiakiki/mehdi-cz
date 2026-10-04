fn classify() -> i32 {
    let inner = || {
        return 1;
    };
    inner();
    2
}

fn main() {
    assert_eq!(
        classify(),
        1,
        "return inside a closure returns from that closure call, not from the enclosing function"
    );
}
