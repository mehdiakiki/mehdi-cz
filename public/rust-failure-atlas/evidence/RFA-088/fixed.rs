fn main() {
    let future = async { 42 };
    let _pinned = Box::pin(future);
}
