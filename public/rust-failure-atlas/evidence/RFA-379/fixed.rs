use std::{env, path::PathBuf};

fn main() {
    let paths = [PathBuf::from("/srv/bin"), PathBuf::from("/tmp/tools")];
    let joined = env::join_paths(&paths).expect("both elements are representable");
    assert_eq!(env::split_paths(&joined).collect::<Vec<_>>(), paths);

    let invalid = env::join_paths(["/tmp/has:colon"]);
    assert!(invalid.is_err());
}
