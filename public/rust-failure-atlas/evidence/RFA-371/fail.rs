trait Duplicate {
    fn duplicate(&self) -> Self;
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
    let value: &dyn Duplicate = &Job;
    assert_eq!(value.label(), "job");
}
