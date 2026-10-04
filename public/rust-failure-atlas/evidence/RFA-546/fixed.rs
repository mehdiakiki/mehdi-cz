fn main() {
    let workers = [String::from("alpha"), String::from("beta")];
    let [first, second] = workers;

    assert_eq!(first, "alpha");
    assert_eq!(second, "beta");
}
