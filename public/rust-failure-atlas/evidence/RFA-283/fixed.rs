use std::ops::Range;

fn finite_nonempty_range(start: f64, end: f64) -> Result<Range<f64>, &'static str> {
    if !start.is_finite() || !end.is_finite() {
        return Err("range endpoints must be finite");
    }
    if start >= end {
        return Err("range must increase");
    }
    Ok(start..end)
}

fn main() {
    assert_eq!(finite_nonempty_range(0.0, f64::NAN), Err("range endpoints must be finite"));
    assert_eq!(finite_nonempty_range(0.0, 1.0), Ok(0.0..1.0));
}
