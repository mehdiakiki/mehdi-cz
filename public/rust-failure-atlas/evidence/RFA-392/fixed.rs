use std::cell::Cell;

fn main() {
    let calls = Cell::new(0);
    let kept = [1, 2, 1].into_iter().skip_while(|value| {
        calls.set(calls.get() + 1);
        *value < 2
    }).collect::<Vec<_>>();
    assert_eq!(kept, vec![2, 1]);
    assert_eq!(calls.get(), 2);

    let global = [1, 2, 1].into_iter().filter(|value| *value >= 2).collect::<Vec<_>>();
    assert_eq!(global, vec![2]);
}
