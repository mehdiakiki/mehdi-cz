struct Session(String);

fn reset(session: &mut Session) -> Session {
    std::mem::take(session)
}

fn main() {
    let mut session = Session(String::from("active"));
    let _old = reset(&mut session);
}
