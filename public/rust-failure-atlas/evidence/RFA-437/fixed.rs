trait Convert<T> {
    fn convert<U>(&self, value: U);
}

struct Converter;
impl Convert<u8> for Converter {
    fn convert<U>(&self, _value: U) {}
}

fn main() {
    <Converter as Convert<u8>>::convert(&Converter, "value");
}
