fn main() {
    let result = std::panic::catch_unwind(|| {
        std::thread::scope(|scope| {
            scope.spawn(|| panic!("child failed"));
        });
    });

    assert!(
        result.is_ok(),
        "thread::scope automatically joins unjoined children and propagates their panic"
    );
}
