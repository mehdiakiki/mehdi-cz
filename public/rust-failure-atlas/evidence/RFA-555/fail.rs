use std::sync::atomic::AtomicUsize;

const REQUESTS: AtomicUsize = AtomicUsize::new(0);
const REQUESTS_REF: &'static AtomicUsize = &REQUESTS;

fn main() {
    let _ = REQUESTS_REF;
}
