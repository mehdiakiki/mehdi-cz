trait Codec {
    fn version() -> u8
    where
        Self: Sized,
    { 1 }

    fn name(&self) -> &'static str;
}

struct Json;

impl Codec for Json {
    fn name(&self) -> &'static str { "json" }
}

fn main() {
    assert_eq!(Json::version(), 1);
    let codec: &dyn Codec = &Json;
    assert_eq!(codec.name(), "json");
}
