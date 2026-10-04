pub const DEFAULT_TEMPLATE: &str = include_str!("../assets/default.txt");

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn repository_build_can_read_the_local_asset() {
        assert_eq!(DEFAULT_TEMPLATE.trim(), "hello from the packaged template");
    }
}
