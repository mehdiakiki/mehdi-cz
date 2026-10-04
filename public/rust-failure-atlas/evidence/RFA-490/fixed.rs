trait Reporter {
    fn report(&self) -> &'static str;
}

struct HealthCheck;

impl Reporter for HealthCheck {
    fn report(&self) -> &'static str {
        "healthy"
    }
}

fn main() {
    assert_eq!(HealthCheck.report(), "healthy");
}
