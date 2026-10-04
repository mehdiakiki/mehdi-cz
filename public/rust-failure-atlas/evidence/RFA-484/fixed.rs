trait Decoder {
    type Output;
}

fn decode<D: Decoder>(value: D::Output) -> D::Output {
    value
}

fn main() {}
