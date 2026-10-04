fn main() {
    let observed = std::thread::scope(|scope| {
        let handle = scope.spawn(|| panic!("child failed"));
        handle.join().is_err()
    });

    assert!(observed);
}
