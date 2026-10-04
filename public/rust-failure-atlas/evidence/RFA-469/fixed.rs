fn decode_header() -> u8 { 1 }
fn decode_payload() -> u8 { 2 }

fn main() {
    assert_eq!((decode_header(), decode_payload()), (1, 2));
}
