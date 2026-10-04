fn main() {
    let mut jobs = vec!["parse", "index", "serve", "report"];
    let removed = jobs.swap_remove(1);
    assert_eq!(removed, "index");
    assert_eq!(jobs, ["parse", "serve", "report"],
        "Vec::swap_remove fills the hole with the last element and does not preserve order");
}
