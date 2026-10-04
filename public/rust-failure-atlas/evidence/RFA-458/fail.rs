#![deny(bindings_with_variant_name)]

enum Method {
    Get,
    Post,
}

fn is_get(method: Method) -> bool {
    match method {
        Get => true,
        _ => false,
    }
}

fn main() {
    assert!(is_get(Method::Get));
}
