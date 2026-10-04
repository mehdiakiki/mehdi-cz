fn main() {
    let mut visits = 0;
    'outer: loop {
        visits += 1;
        break 'outer;
    }
    assert_eq!(visits, 1);
}
