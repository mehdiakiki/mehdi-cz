fn main() {
    let outcome = 'decision: {
        break 'decision "ready";
    };

    assert_eq!(outcome, "ready");
}
