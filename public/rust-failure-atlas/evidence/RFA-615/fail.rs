fn levels(depth: u8) -> impl Iterator<Item = u8> {
    std::iter::once(depth).chain(levels(depth.saturating_sub(1)))
}

fn main() {}
