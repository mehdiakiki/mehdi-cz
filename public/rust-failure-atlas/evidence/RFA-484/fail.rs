trait Decoder {
    type Output;
}

fn decode<D: Decoder>() -> <D as Decoder>::Error {
    loop {}
}

fn main() {}
