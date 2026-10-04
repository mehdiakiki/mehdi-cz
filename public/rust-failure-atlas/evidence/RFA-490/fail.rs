trait Reporter {
    fn report(&self) -> &'static str;
}

struct HealthCheck;

impl Reporter for HealthCheck {}

fn main() {}
