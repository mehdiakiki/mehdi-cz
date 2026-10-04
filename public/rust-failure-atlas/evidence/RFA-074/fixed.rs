async fn load() -> u8 {
    async { 1_u8 }.await
}

fn main() {
    let _future = load();
}
