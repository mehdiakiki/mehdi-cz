struct Enabled(bool);

fn main() {
    let enabled = Enabled(true);
    let _disabled = !enabled;
}
