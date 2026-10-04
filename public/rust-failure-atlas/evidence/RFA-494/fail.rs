trait Choose {
    fn choose<'short, 'long: 'short>(short: &'short str, long: &'long str) -> &'short str;
}

struct PreferLong;

impl Choose for PreferLong {
    fn choose<'short, 'long>(_: &'short str, long: &'long str) -> &'short str {
        long
    }
}

fn main() {}
