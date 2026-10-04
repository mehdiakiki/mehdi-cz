fn main() {
    'records: loop {
        let should_stop = || true;
        if should_stop() {
            break 'records;
        }
    }
}
