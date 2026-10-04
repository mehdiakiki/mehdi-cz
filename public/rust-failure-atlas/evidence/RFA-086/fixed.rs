use std::rc::Rc;

async fn load() -> usize {
    let copied = {
        let local = Rc::new(41);
        *local
    };
    std::future::ready(()).await;
    copied + 1
}

fn require_send<T: Send>(_: T) {}

fn main() {
    require_send(load());
}
