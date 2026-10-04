use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::from([("blue", 1), ("green", 2)]);
    let _same_value_twice = scores.get_disjoint_mut(["blue", "blue"]);
}
