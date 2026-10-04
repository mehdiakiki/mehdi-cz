fn main() {
    let positions = "ababa"
        .match_indices("aba")
        .map(|(index, _)| index)
        .collect::<Vec<_>>();

    assert_eq!(
        positions,
        [0, 2],
        "str::match_indices returns disjoint matches and skips overlaps"
    );
}
