use std::time::Duration;

fn main() {
    assert!(Duration::try_from_secs_f64(-0.5).is_err());
    assert!(Duration::try_from_secs_f64(f64::NAN).is_err());
    assert_eq!(
        Duration::try_from_secs_f64(0.5),
        Ok(Duration::from_millis(500))
    );
}
