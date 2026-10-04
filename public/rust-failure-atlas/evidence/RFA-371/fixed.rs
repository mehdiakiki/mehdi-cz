trait Duplicate {
    fn duplicate(&self) -> Self
    where
        Self: Sized;

    fn label(&self) -> &'static str;
}

#[derive(Clone)]
struct Job;

impl Duplicate for Job {
    fn duplicate(&self) -> Self {
        self.clone()
    }

    fn label(&self) -> &'static str {
        "job"
    }
}

fn main() {
    let concrete = Job;
    let _copy = concrete.duplicate();

    let value: &dyn Duplicate = &concrete;
    assert_eq!(value.label(), "job");
}
