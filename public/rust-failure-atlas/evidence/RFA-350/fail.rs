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
    let mut session = Session { state: "ready" };
    let previous = mem::take(&mut session);

    assert_eq!(previous.state, "ready");
    assert_eq!(
        session.state,
        "empty",
        "mem::take installs Default::default(); Default does not promise a domain-empty value"
    );
}
