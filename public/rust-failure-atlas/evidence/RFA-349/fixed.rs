fn classify() -> i32 {
    let inner = || {
        return 1;
    };
    let decision = inner();
    decision
}

fn main() {
    assert_eq!(classify(), 1);
}
