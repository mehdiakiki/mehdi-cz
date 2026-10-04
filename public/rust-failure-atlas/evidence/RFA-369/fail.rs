trait HealthCheck {
    async fn healthy(&self) -> bool;
}

struct Local;

impl HealthCheck for Local {
    async fn healthy(&self) -> bool {
        true
    }
}

fn register(_check: &dyn HealthCheck) {}

fn main() {
    register(&Local);
}
