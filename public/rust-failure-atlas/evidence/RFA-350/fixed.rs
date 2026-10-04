use std::mem;

#[derive(Debug, PartialEq)]
struct Session {
    state: &'static str,
}

impl Default for Session {
    fn default() -> Self {
        Self { state: "warming" }
    }
}

fn main() {
    let mut first = Session { state: "ready" };
    let previous = mem::take(&mut first);
    assert_eq!(previous.state, "ready");
    assert_eq!(first.state, "warming");

    let mut second = Session { state: "ready" };
    let previous = mem::replace(&mut second, Session { state: "empty" });
    assert_eq!(previous.state, "ready");
    assert_eq!(second.state, "empty");
}
