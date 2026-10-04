fn main() {
    let mut attempts = 0;

    'search: loop {
        attempts += 1;
        break 'search;
    }

    assert_eq!(attempts, 1);
}
