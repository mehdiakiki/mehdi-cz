trait Choose {
    fn choose<'short, 'long: 'short>(short: &'short str, long: &'long str) -> &'short str;
}

struct PreferLong;

impl Choose for PreferLong {
    fn choose<'short, 'long: 'short>(_: &'short str, long: &'long str) -> &'short str {
        long
    }
}

fn main() {
    assert_eq!(PreferLong::choose("fallback", "preferred"), "preferred");
}
