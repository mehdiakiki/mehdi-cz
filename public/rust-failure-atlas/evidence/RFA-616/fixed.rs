async fn prepare() -> u8 {
    async { 42_u8 }.await
}

fn main() {
    let _future = prepare();
}
