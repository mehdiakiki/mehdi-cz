type CacheKey<T> = u64;

fn main() {
    let key: CacheKey<String> = 7;
    assert_eq!(key, 7);
}
