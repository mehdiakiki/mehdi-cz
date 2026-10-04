trait FeatureFlag {
    const ENABLED: bool;
}

struct Search;

impl FeatureFlag for Search {
    const ENABLED: bool = true;
}

fn main() {
    assert!(Search::ENABLED);
}
