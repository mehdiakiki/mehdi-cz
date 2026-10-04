fn build<T>() -> impl Sized + use<T> {}

fn main() {
    build::<u8>();
}
