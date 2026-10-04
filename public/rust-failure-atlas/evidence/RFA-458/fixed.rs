enum Method {
    Get,
    Post,
}

fn is_get(method: Method) -> bool {
    match method {
        Method::Get => true,
        Method::Post => false,
    }
}

fn main() {
    assert!(is_get(Method::Get));
}
