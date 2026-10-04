fn main() {
    let mut jobs = vec!["parse", "index", "serve", "report"];
    let removed = jobs.remove(1);
    assert_eq!(removed, "index");
    assert_eq!(jobs, ["parse", "serve", "report"]);
}
