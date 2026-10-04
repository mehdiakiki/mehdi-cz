trait Project<'a> {
    type Output;
}

impl<'a, T: 'a> Project<'a> for T {
    type Output = &'a T;
}

struct Snapshot<'a, T>
where
    T: 'a,
{
    value: <T as Project<'a>>::Output,
}

fn main() {
    let value = String::from("ready");
    let snapshot: Snapshot<'_, String> = Snapshot { value: &value };
    assert_eq!(snapshot.value, "ready");
}
