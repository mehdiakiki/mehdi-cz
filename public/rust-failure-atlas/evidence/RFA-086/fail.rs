use std::rc::Rc;

async fn load() -> usize {
    let local = Rc::new(41);
    std::future::ready(()).await;
    *local + 1
}

fn require_send<T: Send>(_: T) {}

fn main() {
    require_send(load());
}
