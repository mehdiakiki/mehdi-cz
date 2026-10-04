fn main() {
    let mut values = [10, 20].into_iter();
    let remaining = values.advance_by(5).expect_err("the iterator contains fewer than five items");
    assert_eq!(remaining.get(), 5, "advance_by reports how many requested steps were not completed, not the original request");
}
