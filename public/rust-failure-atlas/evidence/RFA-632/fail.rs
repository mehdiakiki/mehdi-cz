fn main() {
    'records: loop {
        let stop = || {
            break 'records;
        };
        stop();
    }
}
