use std::future::Future;
use std::pin::Pin;

trait HealthCheck {
    fn healthy(&self) -> Pin<Box<dyn Future<Output = bool> + '_>>;
}

struct Local;

impl HealthCheck for Local {
    fn healthy(&self) -> Pin<Box<dyn Future<Output = bool> + '_>> {
        Box::pin(async { true })
    }
}

fn register(check: &dyn HealthCheck) {
    let _future = check.healthy();
}

fn main() {
    register(&Local);
}
