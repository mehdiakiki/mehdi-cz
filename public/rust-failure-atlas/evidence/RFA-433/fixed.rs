trait Ready {}
struct Job;

impl Ready for Job {}

fn accepts_ready<T: Ready>(_value: T) {}

fn main() {
    accepts_ready(Job);
}
