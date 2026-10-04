impl u64 {
    fn as_retry_budget(self) -> u64 {
        self.min(10)
    }
}

fn main() {
    assert_eq!(20_u64.as_retry_budget(), 10);
}
