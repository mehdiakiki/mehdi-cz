fn main() {
    let mut attempts = 0;

    'retry: loop {
        attempts += 1;
        if attempts < 2 {
            continue 'retry;
        }
        break;
    }

    assert_eq!(attempts, 2);
}
