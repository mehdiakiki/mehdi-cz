use proc_macro::TokenStream;

fn helper() -> &'static str {
    "internal API"
}

#[proc_macro]
pub fn identity(input: TokenStream) -> TokenStream {
    let _ = helper();
    input
}
