use std::env;

fn main() {
    let joined = env::join_paths(["/srv/bin", "/tmp/has:colon"])
        .expect("a path element containing the Unix list separator cannot be joined losslessly");
    assert_eq!(joined, "/srv/bin:/tmp/has:colon");
}
