use std::num::{IntErrorKind, NonZeroU32};

fn parse_worker_count(raw: &str) -> Result<NonZeroU32, String> {
    NonZeroU32::from_str_radix(raw, 10).map_err(|error| match error.kind() {
        IntErrorKind::Zero => "worker count must be greater than zero".to_owned(),
        _ => format!("invalid worker count: {error}"),
    })
}

fn main() {
    assert_eq!(
        parse_worker_count("0").unwrap_err(),
        "worker count must be greater than zero"
    );
    assert_eq!(parse_worker_count("12").unwrap().get(), 12);
}
