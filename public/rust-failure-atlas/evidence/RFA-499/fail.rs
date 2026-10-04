trait FeatureFlag {
    const ENABLED: bool;
}

struct Search;

impl FeatureFlag for Search {
    const ENABLED: u8 = 1;
}

fn main() {}
