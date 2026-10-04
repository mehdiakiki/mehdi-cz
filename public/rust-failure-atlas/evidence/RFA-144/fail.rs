use std::sync::Mutex;

fn main() {
    let queue = Mutex::new(vec![7]);

    while let Some(value) = queue.lock().unwrap().pop() {
        assert!(
            queue.try_lock().is_ok(),
            "while let keeps the scrutinee guard through the loop body"
        );
        assert_eq!(value, 7);
    }
}
