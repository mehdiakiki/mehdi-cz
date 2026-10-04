use std::sync::Mutex;

fn main() {
    let queue = Mutex::new(vec![7]);

    loop {
        let next = { queue.lock().unwrap().pop() };
        let Some(value) = next else {
            break;
        };

        assert!(queue.try_lock().is_ok());
        assert_eq!(value, 7);
    }
}
