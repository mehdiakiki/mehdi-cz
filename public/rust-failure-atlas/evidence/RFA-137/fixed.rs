struct Session(String);

fn reset(session: &mut Session) -> Session {
    std::mem::replace(session, Session(String::new()))
}

fn main() {
    let mut session = Session(String::from("active"));
    let old = reset(&mut session);
    assert_eq!(old.0, "active");
    assert!(session.0.is_empty());
}
