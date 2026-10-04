fn schedule(total: &mut u32) {
    let reserve = |value: &mut u32| *value += 1;
    let commit = |value: &mut u32| *value += 10;

    reserve(total);
    commit(total);
}

fn main() {
    let mut total = 0;
    schedule(&mut total);
    assert_eq!(total, 11);
}
