#[derive(Default)]
struct State { generation: u32 }

fn main() {
    let mut state = State { generation: 7 };
    let previous = std::mem::take(&mut state);
    assert_eq!(previous.generation, 7);
    assert_eq!(state.generation, 7,
        "mem::take replaces the source with T::default rather than preserving its state");
}
