use proc_macro::TokenStream;

pub fn helper() -> &'static str {
    "ordinary API"
}

#[proc_macro]
pub fn identity(input: TokenStream) -> TokenStream {
    input
}
