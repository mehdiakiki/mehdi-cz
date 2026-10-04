#[inline(always(extra))]
fn hot_path() {}

fn main() {
    hot_path();
}
