#[derive(Clone)]
struct Refresh;

fn refresh() {}

fn main() {
    let _request = Refresh.clone();
    refresh();
}
