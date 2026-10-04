type Provider = for<'a> fn() -> &'a str;

fn main() {
    let _provider: Option<Provider> = None;
}
