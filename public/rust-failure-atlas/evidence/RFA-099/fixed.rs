const BUILD_SHA: Option<&str> = option_env!("RFA_BUILD_SHA");

fn main() {
    assert_eq!(BUILD_SHA.unwrap_or("unknown"), "unknown");
}
