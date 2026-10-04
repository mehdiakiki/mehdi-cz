trait Convert<T = Self> {
    fn convert(&self) -> T;
}

fn use_converter(converter: &dyn Convert) {
    let _ = converter;
}

fn main() {}
