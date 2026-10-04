enum Chain {
    Link(u8, Box<Chain>),
    End,
}

fn depth(chain: &Chain) -> usize {
    match chain {
        Chain::Link(_, next) => 1 + depth(next),
        Chain::End => 0,
    }
}

fn main() {
    let chain = Chain::Link(1, Box::new(Chain::End));
    assert_eq!(depth(&chain), 1);
}
