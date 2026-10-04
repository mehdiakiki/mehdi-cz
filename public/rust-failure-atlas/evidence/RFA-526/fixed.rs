fn main() {
    let stop = || {
        for _ in 0..3 {
            break;
        }
    };
    stop();
}
