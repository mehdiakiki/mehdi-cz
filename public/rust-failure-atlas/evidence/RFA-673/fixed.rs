struct State { generation: u32 }

fn main() {
    let mut state = State { generation: 7 };
    let previous = std::mem::replace(&mut state, State { generation: 8 });
    assert_eq!(previous.generation, 7);
    assert_eq!(state.generation, 8);
}
