#[derive(Default, Debug, PartialEq)]
enum Mode {
    Active,
    #[default]
    Passive,
}

fn main() {
    assert_eq!(Mode::default(), Mode::Passive);
}
