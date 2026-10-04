use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::from([("blue", 1), ("green", 2)]);
    let [Some(blue), Some(green)] = scores.get_disjoint_mut(["blue", "green"]) else {
        panic!("both distinct keys must exist");
    };
    *blue += 10;
    *green += 20;

    assert_eq!(scores["blue"], 11);
    assert_eq!(scores["green"], 22);
}
